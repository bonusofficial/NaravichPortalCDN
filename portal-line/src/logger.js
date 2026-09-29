const fs = require('node:fs');
const path = require('node:path');

const LOG_FILE = /^(\d{4}-\d{2}-\d{2})\.log$/;
const pad = (n, width = 2) => String(n).padStart(width, '0');

function localDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ISO 8601 in server local time, e.g. 2026-09-29T23:15:02.123+07:00
function localIso(d) {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return (
    `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `.${pad(d.getMilliseconds(), 3)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

// One JSON object per line in <dir>/<YYYY-MM-DD>.log, pruned after `retentionDays`.
function createLogger({ dir, retentionDays, console: toConsole = true }) {
  fs.mkdirSync(dir, { recursive: true });
  let prunedFor = '';

  function prune(today) {
    if (prunedFor === today) return;
    prunedFor = today;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffDate = localDate(cutoff);
    for (const file of fs.readdirSync(dir)) {
      const match = file.match(LOG_FILE);
      if (match && match[1] < cutoffDate) fs.rmSync(path.join(dir, file), { force: true });
    }
  }

  function write(level, event, fields = {}) {
    const now = new Date();
    const today = localDate(now);
    const line = JSON.stringify({ time: localIso(now), level, event, ...fields });
    try {
      prune(today);
      fs.appendFileSync(path.join(dir, `${today}.log`), `${line}\n`);
    } catch (err) {
      console.error(`[logger] cannot write log file: ${err.message}`);
    }
    if (toConsole) (level === 'error' ? console.error : console.log)(line);
  }

  // Newest entries first, across daily files.
  function recent({ limit = 100, level } = {}) {
    const files = fs
      .readdirSync(dir)
      .filter((file) => LOG_FILE.test(file))
      .sort()
      .reverse();
    const entries = [];
    for (const file of files) {
      const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n').reverse();
      for (const line of lines) {
        if (!line) continue;
        let entry;
        try {
          entry = JSON.parse(line);
        } catch {
          continue;
        }
        if (level && entry.level !== level) continue;
        entries.push(entry);
        if (entries.length >= limit) return entries;
      }
    }
    return entries;
  }

  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
    recent,
  };
}

module.exports = { createLogger };
