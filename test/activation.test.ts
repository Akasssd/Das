import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  DEMO_CODE,
  cancelSubscription,
  daysLeft,
  isActive,
  redeemCode,
  SUBSCRIPTION_DURATION_DAYS,
} from '../src/utils/activation';
import { DEFAULT_SUBSCRIPTION } from '../src/types';

test('redeemCode rejects empty input', () => {
  assert.deepEqual(redeemCode(''), { ok: false, error: 'empty' });
  assert.deepEqual(redeemCode('   '), { ok: false, error: 'empty' });
});

test('redeemCode accepts the DEMO123 test code as basic tier', () => {
  const res = redeemCode(DEMO_CODE);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.subscription.tier, 'basic');
    assert.equal(res.subscription.activationCode, DEMO_CODE);
  }
});

test('redeemCode is case-insensitive', () => {
  const upper = redeemCode('demo123');
  assert.equal(upper.ok, true);
});

test('redeemCode parses VIP- prefix as VIP tier', () => {
  const res = redeemCode('VIP-ABCD');
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.subscription.tier, 'vip');
});

test('redeemCode parses BASIC- prefix as basic tier', () => {
  const res = redeemCode('BASIC-WXYZ');
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.subscription.tier, 'basic');
});

test('redeemCode rejects unknown formats', () => {
  assert.deepEqual(redeemCode('NOPE'), { ok: false, error: 'invalid' });
});

test('redeemCode sets renewsAt 30 days in the future', () => {
  const before = Date.now();
  const res = redeemCode(DEMO_CODE);
  assert.equal(res.ok, true);
  if (res.ok) {
    const expiry = new Date(res.subscription.renewsAt!).getTime();
    const elapsedDays = (expiry - before) / (24 * 60 * 60 * 1000);
    assert.ok(
      Math.abs(elapsedDays - SUBSCRIPTION_DURATION_DAYS) < 1,
      `expected ~${SUBSCRIPTION_DURATION_DAYS} days, got ${elapsedDays}`,
    );
  }
});

test('isActive returns false for default free subscription', () => {
  assert.equal(isActive(DEFAULT_SUBSCRIPTION), false);
});

test('isActive returns true within paid period', () => {
  const res = redeemCode(DEMO_CODE);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(isActive(res.subscription), true);
});

test('isActive returns false after expiry', () => {
  const res = redeemCode(DEMO_CODE);
  assert.equal(res.ok, true);
  if (res.ok) {
    const future = new Date(
      Date.now() + (SUBSCRIPTION_DURATION_DAYS + 5) * 24 * 60 * 60 * 1000,
    );
    assert.equal(isActive(res.subscription, future), false);
  }
});

test('daysLeft is around 30 just after activation', () => {
  const res = redeemCode(DEMO_CODE);
  assert.equal(res.ok, true);
  if (res.ok) {
    const left = daysLeft(res.subscription);
    assert.ok(left >= SUBSCRIPTION_DURATION_DAYS - 1 && left <= SUBSCRIPTION_DURATION_DAYS);
  }
});

test('cancelSubscription returns the default free state', () => {
  assert.deepEqual(cancelSubscription(), DEFAULT_SUBSCRIPTION);
});
