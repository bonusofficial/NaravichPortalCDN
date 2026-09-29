const crypto = require('node:crypto');
const express = require('express');
const signature = require('./signature');
const { DedupCache } = require('./dedup');
const { deliver } = require('./forwarder');

const LOG_LEVELS = new Set(['info', 'warn', 'error']);

// LINE gives every event a unique webhookEventId (kept on redelivery). Fall back to a
// content hash for anything that lacks one.
function eventKey(event) {
  if (typeof event?.webhookEventId === 'string' && event.webhookEventId !== '') {
    return event.webhookEventId;
  }
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex')}`;
}

// Hide query strings (they may carry tokens) when showing destination URLs.
function publicUrl(url) {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

function safeEqual(a, b) {
  const hash = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
}

function createApp(config, logger) {
  const dedup = new DedupCache({ ttlMs: config.dedupTtlMs });
  const pending = new Set();
  const startedAt = Date.now();
  const stats = {
    received: 0,
    rejected: 0,
    duplicateEvents: 0,
    staleEvents: 0,
    forwarded: 0,
    failed: 0,
  };

  function fanOut(deliveryId, body, lineSignature) {
    const headers = {
      'content-type': 'application/json',
      'user-agent': 'portal-line/1.0',
      'x-line-signature': lineSignature,
      'x-portal-line-delivery': deliveryId,
    };
    for (const dest of config.destinations) {
      if (!dest.enabled) continue;
      const task = deliver({ dest, body, headers, deliveryId, ...config.forward, logger })
        .then((result) => {
          if (result.ok) stats.forwarded++;
          else stats.failed++;
        })
        .finally(() => pending.delete(task));
      pending.add(task);
    }
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.post(config.webhookPath, express.raw({ type: () => true, limit: '1mb' }), (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const lineSignature = req.get('x-line-signature');

    if (!signature.verify(config.channelSecret, raw, lineSignature)) {
      stats.rejected++;
      logger.warn('webhook.rejected', { reason: 'invalid_signature', ip: req.ip });
      return res.status(401).json({ error: 'invalid signature' });
    }

    let body;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      body = null;
    }
    if (!body || typeof body !== 'object' || !Array.isArray(body.events)) {
      stats.rejected++;
      logger.warn('webhook.rejected', { reason: 'invalid_json', ip: req.ip });
      return res.status(400).json({ error: 'body must be JSON with an events array' });
    }

    stats.received++;
    const deliveryId = crypto.randomUUID();
    const now = Date.now();
    const fresh = [];
    let duplicates = 0;
    let stale = 0;
    for (const event of body.events) {
      // Older than the dedup window means we can no longer tell if it is a replay.
      if (typeof event?.timestamp === 'number' && now - event.timestamp > config.dedupTtlMs) {
        stale++;
      } else if (!dedup.add(eventKey(event), now)) {
        duplicates++;
      } else {
        fresh.push(event);
      }
    }
    stats.duplicateEvents += duplicates;
    stats.staleEvents += stale;

    logger.info('webhook.received', {
      deliveryId,
      events: body.events.length,
      fresh: fresh.length,
      duplicates,
      stale,
      eventIds: fresh.map((e) => e?.webhookEventId).filter(Boolean),
      redelivery: body.events.some((e) => e?.deliveryContext?.isRedelivery === true),
      forwardTo: fresh.length ? config.destinations.filter((d) => d.enabled).map((d) => d.name) : [],
      ...(config.log.payload ? { payload: body } : {}),
    });

    if (fresh.length > 0) {
      // Pass LINE's exact bytes through when nothing was dropped so the original
      // signature stays valid; otherwise re-sign the trimmed body with the same secret.
      if (fresh.length === body.events.length) {
        fanOut(deliveryId, raw, lineSignature);
      } else {
        const trimmed = Buffer.from(JSON.stringify({ ...body, events: fresh }));
        fanOut(deliveryId, trimmed, signature.sign(config.channelSecret, trimmed));
      }
    }

    // LINE only needs a fast 200; forwarding continues in the background.
    res.json({ ok: true, deliveryId });
  });

  function requireAdmin(req, res, next) {
    if (!config.adminToken) return res.status(404).json({ error: 'not found' });
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!safeEqual(token, config.adminToken)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  }

  app.get('/admin/status', requireAdmin, (req, res) => {
    res.json({
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      webhookPath: config.webhookPath,
      stats,
      inFlight: pending.size,
      dedupEntries: dedup.size,
      forward: config.forward,
      destinations: config.destinations.map((d) => ({
        name: d.name,
        enabled: d.enabled,
        url: publicUrl(d.url),
        timeoutMs: d.timeoutMs,
        customHeaders: Object.keys(d.headers),
      })),
    });
  });

  app.get('/admin/logs', requireAdmin, (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 1000);
    const level = LOG_LEVELS.has(req.query.level) ? req.query.level : undefined;
    res.json({ entries: logger.recent({ limit, level }) });
  });

  app.use((req, res) => res.status(404).json({ error: 'not found' }));

  // Express needs all four parameters to treat this as the error handler.
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) logger.error('http.error', { path: req.path, error: err.message });
    res.status(status).json({ error: status < 500 ? err.message : 'internal error' });
  });

  return {
    app,
    stats,
    // Resolves once every in-flight forward (including retries) has finished.
    async idle() {
      while (pending.size > 0) await Promise.allSettled([...pending]);
    },
    get inFlight() {
      return pending.size;
    },
  };
}

module.exports = { createApp, publicUrl };
