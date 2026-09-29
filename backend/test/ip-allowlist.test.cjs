const assert = require('node:assert/strict');
const test = require('node:test');
const { ipMatchesAny, isValidIpRule } = require('../dist/common/utils/ip.js');

test('matches exact IP addresses and CIDR ranges', () => {
  assert.equal(isValidIpRule('10.8.0.0/24'), true);
  assert.equal(isValidIpRule('10.8.0.0/99'), false);
  assert.equal(ipMatchesAny('10.8.0.42', ['10.8.0.0/24']), true);
  assert.equal(ipMatchesAny('10.9.0.42', ['10.8.0.0/24']), false);
  assert.equal(ipMatchesAny('2001:db8::5', ['2001:db8::/32']), true);
  assert.equal(ipMatchesAny('10.8.0.42', ['2001:db8::/32']), false);
});
