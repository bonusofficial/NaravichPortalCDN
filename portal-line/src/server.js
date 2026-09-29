const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { createApp, publicUrl } = require('./app');

// Upper bound for letting queued retries finish on restart/stop.
const SHUTDOWN_GRACE_MS = 30_000;

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`[config] ${err.message}`);
  process.exit(1);
}

const logger = createLogger(config.log);
const relay = createApp(config, logger);

const server = relay.app.listen(config.port, config.host, () => {
  logger.info('server.started', {
    host: config.host,
    port: config.port,
    webhookPath: config.webhookPath,
    destinations: config.destinations.map((d) => ({
      name: d.name,
      enabled: d.enabled,
      url: publicUrl(d.url),
    })),
  });
  if (!config.destinations.some((d) => d.enabled)) {
    logger.warn('config.no_destinations', { hint: 'set DEST_1_URL and DEST_1_ENABLED=true in .env' });
  }
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  logger.info('server.stopping', { signal, inFlight: relay.inFlight });
  server.close();
  const grace = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_GRACE_MS).unref());
  await Promise.race([relay.idle(), grace]);
  logger.info('server.stopped', { abandoned: relay.inFlight });
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
