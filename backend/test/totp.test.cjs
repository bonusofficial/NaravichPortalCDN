const assert = require('node:assert/strict');
const test = require('node:test');
const { encodeBase32, totp, verifyTotp } = require('../dist/common/utils/totp.js');

test('generates and verifies RFC 6238 compatible codes', () => {
  const secret = encodeBase32(Buffer.from('12345678901234567890'));
  const time = 59_000;
  assert.equal(totp(secret, time), '287082');
  assert.equal(verifyTotp(secret, '287082', time), true);
  assert.equal(verifyTotp(secret, '000000', time), false);
});
