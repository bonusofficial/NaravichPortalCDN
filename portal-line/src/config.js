const path = require('node:path');

const DEST_URL_KEY = /^DEST_(\d+)_URL$/;

function parseBool(value, fallback, name) {
  if (value === undefined || value.trim() === '') return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  throw new Error(`${name} must be true or false (got "${value}")`);
}

function parseInt10(value, fallback, name, min = 0) {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`${name} must be an integer >= ${min} (got "${value}")`);
  }
  return n;
}

function parseHeaders(value, name) {
  if (value === undefined || value.trim() === '') return {};
  let headers;
  try {
    headers = JSON.parse(value);
  } catch {
    throw new Error(`${name} must be a JSON object, e.g. {"Authorization":"Bearer xxx"}`);
  }
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    throw new Error(`${name} must be a JSON object`);
  }
  for (const [key, val] of Object.entries(headers)) {
    if (typeof val !== 'string') throw new Error(`${name}.${key} must be a string`);
  }
  return headers;
}

function parseDestination(env, n, defaultTimeoutMs) {
  const prefix = `DEST_${n}`;
  const rawUrl = env[`${prefix}_URL`].trim();
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${prefix}_URL is not a valid URL (got "${rawUrl}")`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${prefix}_URL must start with http:// or https://`);
  }
  return {
    id: n,
    name: env[`${prefix}_NAME`]?.trim() || `dest${n}`,
    url: url.toString(),
    enabled: parseBool(env[`${prefix}_ENABLED`], true, `${prefix}_ENABLED`),
    headers: parseHeaders(env[`${prefix}_HEADERS`], `${prefix}_HEADERS`),
    timeoutMs: parseInt10(env[`${prefix}_TIMEOUT_MS`], defaultTimeoutMs, `${prefix}_TIMEOUT_MS`, 1),
  };
}

function loadConfig(env = process.env) {
  const channelSecret = env.LINE_CHANNEL_SECRET?.trim();
  if (!channelSecret) throw new Error('LINE_CHANNEL_SECRET is required');

  const webhookPath = env.WEBHOOK_PATH?.trim() || '/webhook/line';
  if (!webhookPath.startsWith('/')) throw new Error('WEBHOOK_PATH must start with /');

  const timeoutMs = parseInt10(env.FORWARD_TIMEOUT_MS, 5000, 'FORWARD_TIMEOUT_MS', 1);

  const destinations = Object.keys(env)
    .map((key) => key.match(DEST_URL_KEY))
    .filter((m) => m && env[m[0]].trim() !== '')
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b)
    .map((n) => parseDestination(env, n, timeoutMs));

  const names = new Set();
  for (const dest of destinations) {
    if (names.has(dest.name)) throw new Error(`Duplicate destination name "${dest.name}"`);
    names.add(dest.name);
  }

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port: parseInt10(env.PORT, 3100, 'PORT', 1),
    webhookPath,
    channelSecret,
    adminToken: env.ADMIN_TOKEN?.trim() || '',
    destinations,
    forward: {
      maxRetries: parseInt10(env.FORWARD_MAX_RETRIES, 3, 'FORWARD_MAX_RETRIES'),
      retryBaseMs: parseInt10(env.FORWARD_RETRY_BASE_MS, 1000, 'FORWARD_RETRY_BASE_MS'),
    },
    dedupTtlMs: parseInt10(env.DEDUP_TTL_SECONDS, 86400, 'DEDUP_TTL_SECONDS', 1) * 1000,
    log: {
      dir: path.resolve(env.LOG_DIR?.trim() || path.join(__dirname, '..', 'logs')),
      retentionDays: parseInt10(env.LOG_RETENTION_DAYS, 14, 'LOG_RETENTION_DAYS', 1),
      payload: parseBool(env.LOG_PAYLOAD, false, 'LOG_PAYLOAD'),
      console: true,
    },
  };
}

module.exports = { loadConfig };
