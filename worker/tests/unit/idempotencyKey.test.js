const { idempotencyKey } = require('../../src/utils/idempotency');

test('idempotencyKey is stable for same inputs', () => {
  const k1 = idempotencyKey('abc', '2020-01-01T00:00:10.000Z');
  const k2 = idempotencyKey('abc', '2020-01-01T00:00:10.000Z');
  expect(k1).toBe(k2);
});

test('idempotencyKey changes if releaseAt changes', () => {
  const k1 = idempotencyKey('abc', '2020-01-01T00:00:10.000Z');
  const k2 = idempotencyKey('abc', '2021-01-01T00:00:10.000Z');
  expect(k1).not.toBe(k2);
});
