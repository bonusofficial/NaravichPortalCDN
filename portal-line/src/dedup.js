// Remembers event keys for `ttlMs`. Entries share one TTL, so Map insertion
// order is also expiry order and sweeping stops at the first live entry.
class DedupCache {
  constructor({ ttlMs, maxEntries = 100_000 }) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  // Returns true the first time a key is seen within the TTL window.
  add(key, now = Date.now()) {
    this.sweep(now);
    if (this.entries.has(key)) return false;
    this.entries.set(key, now + this.ttlMs);
    if (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
    return true;
  }

  sweep(now = Date.now()) {
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt > now) break;
      this.entries.delete(key);
    }
  }

  get size() {
    return this.entries.size;
  }
}

module.exports = { DedupCache };
