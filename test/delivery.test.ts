import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeShipDate,
  computeEstimatedDelivery,
  isBoxEligible,
  pickActiveOrder,
  reconcileOrders,
} from '../src/utils/delivery';
import { DEFAULT_SUBSCRIPTION, EMPTY_ADDRESS } from '../src/types';

test('computeShipDate is 5 days before predicted period', () => {
  assert.equal(computeShipDate('2026-05-10'), '2026-05-05');
});

test('computeEstimatedDelivery is 3 days after ship date', () => {
  assert.equal(computeEstimatedDelivery('2026-05-05'), '2026-05-08');
});

test('isBoxEligible: free / premium not eligible', () => {
  assert.equal(isBoxEligible({ ...DEFAULT_SUBSCRIPTION, tier: 'free' }), false);
  assert.equal(
    isBoxEligible({ ...DEFAULT_SUBSCRIPTION, tier: 'premium' }),
    false,
  );
});

test('isBoxEligible: active VIP eligible', () => {
  assert.equal(isBoxEligible({ ...DEFAULT_SUBSCRIPTION, tier: 'vip' }), true);
});

test('isBoxEligible: cancelled VIP past expiry not eligible', () => {
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
  assert.equal(
    isBoxEligible({
      ...DEFAULT_SUBSCRIPTION,
      tier: 'vip',
      cancelled: true,
      renewsAt: past,
    }),
    false,
  );
});

test('isBoxEligible: cancelled VIP still inside paid window stays eligible', () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString();
  assert.equal(
    isBoxEligible({
      ...DEFAULT_SUBSCRIPTION,
      tier: 'vip',
      cancelled: true,
      renewsAt: future,
    }),
    true,
  );
});

const filledAddress = {
  ...EMPTY_ADDRESS,
  country: 'RU',
  city: 'Moscow',
  street: 'Tverskaya',
  building: '1',
  phone: '+79990000000',
};
const vip = { ...DEFAULT_SUBSCRIPTION, tier: 'vip' as const };

test('reconcileOrders: skips when not VIP', () => {
  const r = reconcileOrders({
    subscription: { ...DEFAULT_SUBSCRIPTION, tier: 'free' },
    address: filledAddress,
    nextPeriodStart: '2050-01-01',
    orders: [],
  });
  assert.deepEqual(r.orders, []);
  assert.equal(r.changed, false);
});

test('reconcileOrders: skips when address not filled', () => {
  const r = reconcileOrders({
    subscription: vip,
    address: EMPTY_ADDRESS,
    nextPeriodStart: '2050-01-01',
    orders: [],
  });
  assert.deepEqual(r.orders, []);
});

test('reconcileOrders: creates one order for the upcoming cycle', () => {
  const r = reconcileOrders({
    subscription: vip,
    address: filledAddress,
    nextPeriodStart: '2050-06-10',
    orders: [],
  });
  assert.equal(r.changed, true);
  assert.equal(r.orders.length, 1);
  assert.equal(r.orders[0].cycleAnchor, '2050-06-10');
  assert.equal(r.orders[0].shipDate, '2050-06-05');
  assert.equal(r.orders[0].estimatedDelivery, '2050-06-08');
  assert.equal(r.orders[0].status, 'processing');
});

test('reconcileOrders: does not duplicate for the same cycle anchor', () => {
  const first = reconcileOrders({
    subscription: vip,
    address: filledAddress,
    nextPeriodStart: '2050-06-10',
    orders: [],
  });
  const second = reconcileOrders({
    subscription: vip,
    address: filledAddress,
    nextPeriodStart: '2050-06-10',
    orders: first.orders,
  });
  assert.equal(second.orders.length, 1);
  assert.equal(second.changed, false);
});

test('pickActiveOrder: empty list returns null', () => {
  assert.equal(pickActiveOrder([]), null);
});

test('pickActiveOrder: prefers shipped over processing', () => {
  const orders = [
    {
      id: 'a',
      createdAt: '',
      cycleAnchor: '2030-01-01',
      shipDate: '2029-12-27',
      estimatedDelivery: '2029-12-30',
      status: 'processing' as const,
      address: EMPTY_ADDRESS,
    },
    {
      id: 'b',
      createdAt: '',
      cycleAnchor: '2030-02-01',
      shipDate: '2030-01-27',
      estimatedDelivery: '2030-01-30',
      status: 'shipped' as const,
      address: EMPTY_ADDRESS,
    },
  ];
  assert.equal(pickActiveOrder(orders)?.id, 'b');
});
