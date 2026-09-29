const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { loadConfig } = require('../src/config');
const { createLogger } = require('../src/logger');
const { createApp } = require('../src/app');
const { sign, verify } = require('../src/signature');
const { DedupCache } = require('../src/dedup');

const SECRET = 'test-channel-secret';
const ADMIN_TOKEN = 'test-admin-token';

// Fake destination website. `respond(req, res, attemptNumber)` decides the reply.
function startDestination(respond = (req, res) => res.end('ok')) {
  const received = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      received.push({ headers: req.headers, body: Buffer.concat(chunks) });
      respond(req, res, received.length);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/line/webhook?key=abc`,
        received,
        reset: () => received.splice(0),
        close: () => {
          server.closeAllConnections();
          return new Promise((r) => server.close(r));
        },
      });
    });
  });
}

async function startRelay(env) {
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-line-test-'));
  const config = loadConfig({
    LINE_CHANNEL_SECRET: SECRET,
    ADMIN_TOKEN,
    LOG_DIR: logDir,
    FORWARD_MAX_RETRIES: '2',
    FORWARD_RETRY_BASE_MS: '10',
    FORWARD_TIMEOUT_MS: '150',
    ...env,
  });
  config.log.console = false;
  const logger = createLogger(config.log);
  const relay = createApp(config, logger);
  const server = await new Promise((resolve) => {
    const s = relay.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    ...relay,
    logger,
    base: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await relay.idle();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      fs.rmSync(logDir, { recursive: true, force: true });
    },
  };
}

let seq = 0;
function lineEvent(overrides = {}) {
  seq++;
  return {
    type: 'message',
    mode: 'active',
    timestamp: Date.now(),
    webhookEventId: `01TESTEVENT${seq}`,
    deliveryContext: { isRedelivery: false },
    source: { type: 'user', userId: 'U123' },
    replyToken: `reply-${seq}`,
    message: { id: `m${seq}`, type: 'text', text: 'สวัสดี' },
    ...overrides,
  };
}

const lineBody = (events) => JSON.stringify({ destination: 'Ubot', events });

async function postWebhook(relay, body, signature = sign(SECRET, body)) {
  const headers = { 'content-type': 'application/json' };
  if (signature !== null) headers['x-line-signature'] = signature;
  const res = await fetch(`${relay.base}/webhook/line`, { method: 'POST', headers, body });
  const json = await res.json();
  await relay.idle();
  return { status: res.status, json };
}

describe('webhook relay', () => {
  let shop;
  let crm;
  let disabled;
  let relay;

  before(async () => {
    shop = await startDestination();
    crm = await startDestination();
    disabled = await startDestination();
    relay = await startRelay({
      DEST_1_NAME: 'shop',
      DEST_1_URL: shop.url,
      DEST_2_NAME: 'crm',
      DEST_2_URL: crm.url,
      DEST_2_HEADERS: '{"Authorization":"Bearer crm-token"}',
      DEST_3_NAME: 'booking',
      DEST_3_URL: disabled.url,
      DEST_3_ENABLED: 'false',
    });
  });

  after(async () => {
    await relay.close();
    await Promise.all([shop.close(), crm.close(), disabled.close()]);
  });

  beforeEach(() => {
    shop.reset();
    crm.reset();
    disabled.reset();
  });

  test('forwards LINE body and signature unchanged to every enabled destination', async () => {
    const body = lineBody([lineEvent(), lineEvent()]);
    const signature = sign(SECRET, body);
    const res = await postWebhook(relay, body, signature);

    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    for (const dest of [shop, crm]) {
      assert.equal(dest.received.length, 1);
      const [req] = dest.received;
      assert.equal(req.body.toString(), body);
      assert.equal(req.headers['x-line-signature'], signature);
      assert.equal(req.headers['content-type'], 'application/json');
      assert.equal(req.headers['x-portal-line-delivery'], res.json.deliveryId);
      assert.equal(req.headers['x-portal-line-attempt'], '1');
    }
    assert.equal(crm.received[0].headers.authorization, 'Bearer crm-token');
    assert.equal(shop.received[0].headers.authorization, undefined);
    assert.equal(disabled.received.length, 0, 'disabled destination must not receive anything');
  });

  test('rejects missing or wrong signatures without forwarding', async () => {
    const body = lineBody([lineEvent()]);
    assert.equal((await postWebhook(relay, body, null)).status, 401);
    assert.equal((await postWebhook(relay, body, sign('wrong-secret', body))).status, 401);
    assert.equal((await postWebhook(relay, body, 'not-base64!!')).status, 401);
    assert.equal(shop.received.length + crm.received.length, 0);
    const rejected = relay.logger.recent({ limit: 3 });
    assert.ok(rejected.every((e) => e.event === 'webhook.rejected' && e.reason === 'invalid_signature'));
  });

  test('rejects a correctly signed body that is not LINE JSON', async () => {
    assert.equal((await postWebhook(relay, 'not json')).status, 400);
    assert.equal((await postWebhook(relay, '{"hello":"world"}')).status, 400);
    assert.equal(shop.received.length, 0);
  });

  test('acknowledges LINE "Verify" (empty events) without forwarding', async () => {
    const res = await postWebhook(relay, lineBody([]));
    assert.equal(res.status, 200);
    assert.equal(shop.received.length + crm.received.length, 0);
  });

  test('forwards each event only once, re-signing a partially duplicated batch', async () => {
    const first = lineEvent();
    const second = lineEvent();

    await postWebhook(relay, lineBody([first]));
    assert.equal(shop.received.length, 1);

    // Exact redelivery: nothing new, nothing forwarded.
    const replay = await postWebhook(relay, lineBody([{ ...first, deliveryContext: { isRedelivery: true } }]));
    assert.equal(replay.status, 200);
    assert.equal(shop.received.length, 1);

    // Mixed batch: only the new event goes out, with a signature that still verifies.
    await postWebhook(relay, lineBody([first, second]));
    assert.equal(shop.received.length, 2);
    const forwarded = shop.received[1];
    assert.deepEqual(
      JSON.parse(forwarded.body).events.map((e) => e.webhookEventId),
      [second.webhookEventId],
    );
    assert.ok(verify(SECRET, forwarded.body, forwarded.headers['x-line-signature']));

    const received = relay.logger.recent({ limit: 20 }).filter((e) => e.event === 'webhook.received');
    assert.equal(received[0].duplicates, 1);
    assert.equal(received[0].fresh, 1);
  });

  test('drops events older than the dedup window', async () => {
    const old = lineEvent({ timestamp: Date.now() - 2 * 86400 * 1000 });
    await postWebhook(relay, lineBody([old]));
    assert.equal(shop.received.length, 0);
    const [entry] = relay.logger.recent({ limit: 5 }).filter((e) => e.event === 'webhook.received');
    assert.equal(entry.stale, 1);
  });

  test('admin endpoints require the bearer token', async () => {
    const noToken = await fetch(`${relay.base}/admin/status`);
    assert.equal(noToken.status, 401);
    const wrong = await fetch(`${relay.base}/admin/logs`, { headers: { authorization: 'Bearer nope' } });
    assert.equal(wrong.status, 401);

    const auth = { authorization: `Bearer ${ADMIN_TOKEN}` };
    const status = await (await fetch(`${relay.base}/admin/status`, { headers: auth })).json();
    assert.deepEqual(
      status.destinations.map((d) => [d.name, d.enabled]),
      [['shop', true], ['crm', true], ['booking', false]],
    );
    assert.ok(!status.destinations[0].url.includes('key=abc'), 'query string must be hidden');
    assert.deepEqual(status.destinations[1].customHeaders, ['Authorization']);

    const logs = await (await fetch(`${relay.base}/admin/logs?limit=2`, { headers: auth })).json();
    assert.equal(logs.entries.length, 2);
  });
});

describe('retry and timeout', () => {
  test('retries 5xx until success', async () => {
    const flaky = await startDestination((req, res, n) => {
      res.statusCode = n < 3 ? 503 : 200;
      res.end();
    });
    const relay = await startRelay({ DEST_1_NAME: 'flaky', DEST_1_URL: flaky.url });
    try {
      await postWebhook(relay, lineBody([lineEvent()]));
      assert.equal(flaky.received.length, 3);
      assert.deepEqual(
        flaky.received.map((r) => r.headers['x-portal-line-attempt']),
        ['1', '2', '3'],
      );
      assert.equal(relay.stats.forwarded, 1);
      const events = relay.logger.recent({ limit: 10 }).map((e) => e.event);
      assert.deepEqual(events.slice(0, 3), ['forward.success', 'forward.retry', 'forward.retry']);
    } finally {
      await relay.close();
      await flaky.close();
    }
  });

  test('does not retry a 4xx rejection', async () => {
    const strict = await startDestination((req, res) => {
      res.statusCode = 400;
      res.end('bad request from site');
    });
    const relay = await startRelay({ DEST_1_URL: strict.url });
    try {
      await postWebhook(relay, lineBody([lineEvent()]));
      assert.equal(strict.received.length, 1);
      const [failed] = relay.logger.recent({ limit: 1 });
      assert.equal(failed.event, 'forward.failed');
      assert.equal(failed.status, 400);
      assert.equal(failed.response, 'bad request from site');
    } finally {
      await relay.close();
      await strict.close();
    }
  });

  test('times out slow destinations and gives up after max retries', async () => {
    const slow = await startDestination((req, res) => {
      setTimeout(() => res.end('late'), 400);
    });
    const fast = await startDestination();
    const relay = await startRelay({
      DEST_1_NAME: 'slow',
      DEST_1_URL: slow.url,
      DEST_2_NAME: 'fast',
      DEST_2_URL: fast.url,
    });
    try {
      await postWebhook(relay, lineBody([lineEvent()]));
      assert.equal(slow.received.length, 3, 'FORWARD_MAX_RETRIES=2 means 3 attempts');
      assert.equal(fast.received.length, 1, 'one slow site must not block the others');
      const failed = relay.logger.recent({ level: 'error', limit: 1 })[0];
      assert.equal(failed.dest, 'slow');
      assert.equal(failed.error, 'timeout after 150ms');
      assert.equal(relay.stats.forwarded, 1);
      assert.equal(relay.stats.failed, 1);
    } finally {
      await relay.close();
      await Promise.all([slow.close(), fast.close()]);
    }
  });

  test('retries when the destination is unreachable', async () => {
    const gone = await startDestination();
    await gone.close();
    const relay = await startRelay({ DEST_1_URL: gone.url, FORWARD_MAX_RETRIES: '1' });
    try {
      await postWebhook(relay, lineBody([lineEvent()]));
      const [failed] = relay.logger.recent({ limit: 1 });
      assert.equal(failed.event, 'forward.failed');
      assert.equal(failed.attempts, 2);
      assert.match(failed.error, /ECONNREFUSED/);
    } finally {
      await relay.close();
    }
  });
});

describe('config', () => {
  test('reads numbered destinations from env', () => {
    const config = loadConfig({
      LINE_CHANNEL_SECRET: 's',
      FORWARD_TIMEOUT_MS: '3000',
      DEST_2_URL: 'https://b.example.com/hook',
      DEST_2_ENABLED: 'off',
      DEST_1_URL: 'https://a.example.com/hook',
      DEST_1_NAME: 'site-a',
      DEST_1_TIMEOUT_MS: '8000',
      DEST_10_URL: 'https://c.example.com/hook',
      DEST_4_URL: '',
    });
    assert.deepEqual(
      config.destinations.map((d) => [d.id, d.name, d.enabled, d.timeoutMs]),
      [
        [1, 'site-a', true, 8000],
        [2, 'dest2', false, 3000],
        [10, 'dest10', true, 3000],
      ],
    );
  });

  test('fails fast on bad values', () => {
    assert.throws(() => loadConfig({}), /LINE_CHANNEL_SECRET is required/);
    const base = { LINE_CHANNEL_SECRET: 's' };
    assert.throws(() => loadConfig({ ...base, DEST_1_URL: 'not a url' }), /DEST_1_URL/);
    assert.throws(() => loadConfig({ ...base, DEST_1_URL: 'ftp://x.com' }), /http/);
    assert.throws(
      () => loadConfig({ ...base, DEST_1_URL: 'https://x.com', DEST_1_ENABLED: 'maybe' }),
      /DEST_1_ENABLED/,
    );
    assert.throws(
      () => loadConfig({ ...base, DEST_1_URL: 'https://x.com', DEST_1_HEADERS: '{bad' }),
      /DEST_1_HEADERS/,
    );
    assert.throws(() => loadConfig({ ...base, FORWARD_TIMEOUT_MS: '-5' }), /FORWARD_TIMEOUT_MS/);
    assert.throws(
      () =>
        loadConfig({
          ...base,
          DEST_1_URL: 'https://x.com',
          DEST_1_NAME: 'same',
          DEST_2_URL: 'https://y.com',
          DEST_2_NAME: 'same',
        }),
      /Duplicate destination name/,
    );
  });
});

describe('dedup cache', () => {
  test('forgets keys after the TTL', () => {
    const cache = new DedupCache({ ttlMs: 1000 });
    assert.equal(cache.add('a', 0), true);
    assert.equal(cache.add('a', 500), false);
    assert.equal(cache.add('a', 1000), true);
  });

  test('caps memory by evicting the oldest key', () => {
    const cache = new DedupCache({ ttlMs: 1000, maxEntries: 2 });
    cache.add('a', 0);
    cache.add('b', 1);
    cache.add('c', 2);
    assert.equal(cache.size, 2);
    assert.equal(cache.add('a', 3), true);
  });
});
