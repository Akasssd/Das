import { DEFAULT_SUBSCRIPTION, Subscription, SubscriptionTier } from '../types';

/**
 * Subscription activation utility.
 *
 * Codes are issued by the Telegram bot (@FlowCareBot). The bot:
 *   1. Receives payment from the user.
 *   2. Asks for delivery address + box preferences.
 *   3. Generates a one-time activation code (e.g. `BASIC-A4F2-...` or `VIP-...`)
 *      and sends it back to the user.
 *   4. The user pastes the code into the app to unlock the chosen tier locally.
 *
 * The app does NOT collect address / preferences itself — that flow lives in
 * the bot. Activation just flips a local flag valid for 30 days; the warehouse
 * ships physical boxes against the bot's order DB independently.
 *
 * For development / demo purposes the code `DEMO123` activates the Basic tier
 * for 30 days without calling the bot at all.
 */

export const SUBSCRIPTION_DURATION_DAYS = 30;

/** Hard-coded demo code for QA / first launch. */
export const DEMO_CODE = 'DEMO123';

const norm = (raw: string): string => raw.trim().toUpperCase();

export interface RedeemSuccess {
  ok: true;
  subscription: Subscription;
}

export interface RedeemFailure {
  ok: false;
  error: 'empty' | 'invalid';
}

export type RedeemResult = RedeemSuccess | RedeemFailure;

const buildSubscription = (
  tier: SubscriptionTier,
  code: string,
  productId: string,
): Subscription => {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + SUBSCRIPTION_DURATION_DAYS);
  return {
    tier,
    productId,
    startedAt: now.toISOString(),
    renewsAt: expiry.toISOString(),
    cancelled: false,
    lastSyncedAt: now.toISOString(),
    activationCode: code,
  };
};

/**
 * Parse and redeem an activation code. Returns the new Subscription state
 * on success, or an error tag on failure. This is a pure function — the
 * caller is responsible for persisting the returned subscription.
 */
export const redeemCode = (raw: string): RedeemResult => {
  const code = norm(raw);
  if (!code) return { ok: false, error: 'empty' };

  if (code === DEMO_CODE) {
    return { ok: true, subscription: buildSubscription('basic', code, 'box_basic_monthly') };
  }
  if (code.startsWith('VIP-')) {
    return { ok: true, subscription: buildSubscription('vip', code, 'box_vip_monthly') };
  }
  if (code.startsWith('BASIC-')) {
    return { ok: true, subscription: buildSubscription('basic', code, 'box_basic_monthly') };
  }
  return { ok: false, error: 'invalid' };
};

/** Whether a subscription is currently active (paid period not yet ended). */
export const isActive = (sub: Subscription, now: Date = new Date()): boolean => {
  if (sub.tier === 'free') return false;
  if (!sub.renewsAt) return false;
  return new Date(sub.renewsAt).getTime() > now.getTime();
};

/** Days until the subscription expires (0 if already expired or free). */
export const daysLeft = (sub: Subscription, now: Date = new Date()): number => {
  if (!sub.renewsAt) return 0;
  const ms = new Date(sub.renewsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
};

/** Reset a subscription back to the free tier (cancellation). */
export const cancelSubscription = (): Subscription => ({ ...DEFAULT_SUBSCRIPTION });
