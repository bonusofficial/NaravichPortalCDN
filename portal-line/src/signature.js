const crypto = require('node:crypto');

// LINE signs the raw request body: base64(HMAC-SHA256(channelSecret, body)).
function sign(secret, body) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

function verify(secret, body, signature) {
  if (typeof signature !== 'string' || signature === '') return false;
  const expected = Buffer.from(sign(secret, body), 'base64');
  const given = Buffer.from(signature, 'base64');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

module.exports = { sign, verify };
