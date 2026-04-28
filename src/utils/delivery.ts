import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  BoxOrder,
  OrderStatus,
  ShippingAddress,
  Subscription,
} from '../types';

/** Days before predicted period start when the box is shipped. */
export const SHIP_LEAD_DAYS = 5;

/** Estimated transit time after shipping. */
export const TRANSIT_DAYS = 3;

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Compute the date the next box should ship out, given the predicted next
 * period start. Returns ISO YYYY-MM-DD.
 */
export const computeShipDate = (nextPeriodStart: string): string => {
  return fmt(addDays(parseISO(nextPeriodStart), -SHIP_LEAD_DAYS));
};

export const computeEstimatedDelivery = (shipDate: string): string => {
  return fmt(addDays(parseISO(shipDate), TRANSIT_DAYS));
};

/**
 * Decide whether a given subscription is currently entitled to receive
 * monthly boxes (VIP and not past renewsAt).
 */
export const isBoxEligible = (sub: Subscription): boolean => {
  if (sub.tier !== 'vip') return false;
  if (sub.cancelled && sub.renewsAt) {
    const expires = parseISO(sub.renewsAt);
    if (differenceInCalendarDays(expires, new Date()) < 0) return false;
  }
  return true;
};

/**
 * Pick the most relevant order to display on the home screen / status screen.
 * Prefers an in-flight order; falls back to the next upcoming "processing"
 * order; otherwise the most recent.
 */
export const pickActiveOrder = (orders: BoxOrder[]): BoxOrder | null => {
  if (orders.length === 0) return null;
  const sorted = [...orders].sort((a, b) =>
    a.shipDate < b.shipDate ? -1 : a.shipDate > b.shipDate ? 1 : 0,
  );
  const inFlight = sorted.find((o) => o.status === 'shipped');
  if (inFlight) return inFlight;
  const processing = sorted.find((o) => o.status === 'processing');
  if (processing) return processing;
  return sorted[sorted.length - 1];
};

const isAddressFilled = (a: ShippingAddress): boolean =>
  Boolean(
    a.country.trim() &&
      a.city.trim() &&
      a.street.trim() &&
      a.building.trim() &&
      a.phone.trim(),
  );

const advanceStatus = (
  order: BoxOrder,
  todayKey: string,
): OrderStatus => {
  if (order.status === 'cancelled' || order.status === 'delivered')
    return order.status;
  if (todayKey >= order.estimatedDelivery) return 'delivered';
  if (todayKey >= order.shipDate) return 'shipped';
  return 'processing';
};

export interface ReconcileInput {
  subscription: Subscription;
  address: ShippingAddress;
  /** ISO YYYY-MM-DD of the next predicted period start. */
  nextPeriodStart: string | null;
  orders: BoxOrder[];
}

export interface ReconcileResult {
  /** Updated orders array. */
  orders: BoxOrder[];
  /** True when something actually changed. */
  changed: boolean;
}

/**
 * Idempotent reconciliation:
 *  - Auto-advance order statuses based on today's date.
 *  - Create a new "processing" order for the upcoming cycle if eligible,
 *    address is filled, and no order yet covers it.
 */
export const reconcileOrders = ({
  subscription,
  address,
  nextPeriodStart,
  orders,
}: ReconcileInput): ReconcileResult => {
  const today = new Date();
  const todayKey = fmt(today);
  let changed = false;

  const advanced = orders.map((o) => {
    const next = advanceStatus(o, todayKey);
    if (next !== o.status) {
      changed = true;
      return { ...o, status: next };
    }
    return o;
  });

  if (!isBoxEligible(subscription) || !isAddressFilled(address)) {
    return { orders: advanced, changed };
  }

  if (!nextPeriodStart) {
    return { orders: advanced, changed };
  }

  const cycleAnchor = nextPeriodStart;
  const existing = advanced.find((o) => o.cycleAnchor === cycleAnchor);
  if (existing) {
    return { orders: advanced, changed };
  }

  const shipDate = computeShipDate(cycleAnchor);
  const order: BoxOrder = {
    id: `order-${cycleAnchor}`,
    createdAt: new Date().toISOString(),
    cycleAnchor,
    shipDate,
    estimatedDelivery: computeEstimatedDelivery(shipDate),
    status: todayKey >= shipDate ? 'shipped' : 'processing',
    address: { ...address },
  };
  return { orders: [...advanced, order], changed: true };
};
