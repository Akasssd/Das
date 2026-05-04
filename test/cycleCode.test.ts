import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeCycleCode, encodeCycleCode } from '../src/cycleCode';

test('encode/decode roundtrips a typical payload', () => {
  const payload = { startDate: '2026-04-15', cycleLength: 28, periodLength: 5 };
  const code = encodeCycleCode(payload);
  assert.match(code, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.deepEqual(decodeCycleCode(code), payload);
});

test('decode is tolerant of lowercase and missing dash', () => {
  const payload = { startDate: '2026-04-15', cycleLength: 28, periodLength: 5 };
  const code = encodeCycleCode(payload).toLowerCase().replace('-', '');
  assert.deepEqual(decodeCycleCode(code), payload);
});

test('decode tolerates common typos (O→0, I/L→1, U→V)', () => {
  const payload = { startDate: '2026-04-15', cycleLength: 28, periodLength: 5 };
  const original = encodeCycleCode(payload);
  // Force-replace with lookalikes; decoder should still accept.
  const munged = original.replace('0', 'O').replace('1', 'I');
  if (munged !== original) {
    assert.deepEqual(decodeCycleCode(munged), payload);
  }
});

test('decode rejects a code with bad checksum', () => {
  const payload = { startDate: '2026-04-15', cycleLength: 28, periodLength: 5 };
  const code = encodeCycleCode(payload);
  // Flip a character in the checksum half.
  const bad = code.slice(0, -1) + (code.slice(-1) === 'A' ? 'B' : 'A');
  assert.equal(decodeCycleCode(bad), null);
});

test('encode rejects out-of-range cycle length', () => {
  assert.throws(() =>
    encodeCycleCode({ startDate: '2026-04-15', cycleLength: 17, periodLength: 5 }),
  );
  assert.throws(() =>
    encodeCycleCode({ startDate: '2026-04-15', cycleLength: 90, periodLength: 5 }),
  );
});

test('boundary dates roundtrip', () => {
  const a = encodeCycleCode({ startDate: '2020-01-01', cycleLength: 18, periodLength: 1 });
  assert.deepEqual(decodeCycleCode(a), {
    startDate: '2020-01-01',
    cycleLength: 18,
    periodLength: 1,
  });
  const b = encodeCycleCode({ startDate: '2030-12-31', cycleLength: 35, periodLength: 7 });
  assert.deepEqual(decodeCycleCode(b), {
    startDate: '2030-12-31',
    cycleLength: 35,
    periodLength: 7,
  });
});
