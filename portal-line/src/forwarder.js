const MAX_RETRY_DELAY_MS = 60_000;
const RETRYABLE_STATUS = new Set([408, 425, 429]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function describeError(err, timeoutMs) {
  if (err.name === 'TimeoutError') return `timeout after ${timeoutMs}ms`;
  const cause = err.cause?.code || err.cause?.message;
  return cause ? `${err.message} (${cause})` : err.message;
}

async function attemptOnce(dest, body, headers) {
  const started = Date.now();
  try {
    const res = await fetch(dest.url, {
      method: 'POST',
      headers,
      body,
      // A 301/302 would silently turn the POST into a GET; surface it as a failure instead.
      redirect: 'manual',
      signal: AbortSignal.timeout(dest.timeoutMs),
    });
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true, status: res.status, ms: Date.now() - started };
    }
    const response = (await res.text()).slice(0, 300);
    return {
      ok: false,
      retryable: res.status >= 500 || RETRYABLE_STATUS.has(res.status),
      status: res.status,
      response,
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      retryable: true,
      error: describeError(err, dest.timeoutMs),
      ms: Date.now() - started,
    };
  }
}

// POSTs `body` to one destination, retrying network errors, timeouts, 408/425/429
// and 5xx with exponential backoff (retryBaseMs, x2, x4, ...). Never throws.
async function deliver({ dest, body, headers, deliveryId, maxRetries, retryBaseMs, logger }) {
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    const result = await attemptOnce(dest, body, {
      ...headers,
      ...dest.headers,
      'x-portal-line-attempt': String(attempt),
    });
    const { ok, retryable, ...details } = result;

    if (ok) {
      logger.info('forward.success', {
        deliveryId,
        dest: dest.name,
        attempts: attempt,
        status: details.status,
        ms: Date.now() - started,
      });
      return { ok: true, attempts: attempt };
    }

    if (!retryable || attempt > maxRetries) {
      logger.error('forward.failed', { deliveryId, dest: dest.name, attempts: attempt, ...details });
      return { ok: false, attempts: attempt };
    }

    const nextDelayMs = Math.min(retryBaseMs * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
    logger.warn('forward.retry', { deliveryId, dest: dest.name, attempt, ...details, nextDelayMs });
    await sleep(nextDelayMs);
  }
}

module.exports = { deliver };
