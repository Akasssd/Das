import { differenceInCalendarDays, isBefore, parseISO } from 'date-fns';
import { useCallback, useEffect } from 'react';
import { useApp } from '../AppContext';
import { DEFAULT_SUBSCRIPTION, Subscription, SubscriptionTier } from '../types';
import { activateCode } from '../utils/activation';

export type SubscriptionType = 'premium' | 'basic_box' | 'vip_box' | 'none';

export interface UseSubscriptionApi {
  subscription: Subscription;
  tier: SubscriptionTier;
  /** Friendlier alias used by gates / settings: which kind of plan is active. */
  subscriptionType: SubscriptionType;
  isActive: boolean;
  isBasic: boolean;
  isVip: boolean;
  /** True when any active plan unlocks Premium features (premium / basic / vip). */
  isPremium: boolean;
  /** True when an active plan ships physical boxes (basic / vip). */
  isBoxActive: boolean;
  daysLeft: number;
  /**
   * Send the user-entered activation code to the FlowCare API. On success
   * persists tier + renewsAt locally and returns the resolved tier.
   */
  activate: (code: string) => Promise<
    | { ok: true; tier: SubscriptionTier; expires: string }
    | { ok: false; reason: 'empty' | 'invalid' | 'network' }
  >;
}

const isActiveNow = (sub: Subscription, now = new Date()): boolean => {
  if (sub.tier === 'free' || !sub.renewsAt) return false;
  try {
    return !isBefore(parseISO(sub.renewsAt), now);
  } catch {
    return false;
  }
};

const computeDaysLeft = (sub: Subscription, now = new Date()): number => {
  if (!sub.renewsAt) return 0;
  try {
    const days = differenceInCalendarDays(parseISO(sub.renewsAt), now);
    return Math.max(0, days);
  } catch {
    return 0;
  }
};

/**
 * Subscription state hook.
 *
 * Source of truth: the FlowCare backend (`./api/`) which is fed by
 * the Telegram bot (`./bot/`). The user pastes the bot-issued
 * activation code into the app; we POST it to /v1/activate and
 * mirror the resulting tier + expires locally.
 */
export const useSubscription = (): UseSubscriptionApi => {
  const { data, updateSubscription } = useApp();
  const sub = data.subscription;

  useEffect(() => {
    if (sub.tier !== 'free' && sub.renewsAt && !isActiveNow(sub)) {
      void updateSubscription({ ...DEFAULT_SUBSCRIPTION });
    }
  }, [sub, updateSubscription]);

  const activate = useCallback<UseSubscriptionApi['activate']>(
    async (code) => {
      const trimmed = code.trim();
      if (!trimmed) return { ok: false, reason: 'empty' };
      const res = await activateCode(trimmed);
      if (!res.valid || !res.tariff || !res.expires) {
        return { ok: false, reason: 'invalid' };
      }
      const renewsAtIso = `${res.expires}T00:00:00.000Z`;
      const nowIso = new Date().toISOString();
      const productId =
        res.tariff === 'vip'
          ? 'vip_monthly'
          : res.tariff === 'premium'
            ? 'premium_monthly'
            : 'basic_monthly';
      await updateSubscription({
        tier: res.tariff,
        productId,
        startedAt: nowIso,
        renewsAt: renewsAtIso,
        cancelled: false,
        lastSyncedAt: nowIso,
        activationCode: trimmed,
      });
      return { ok: true, tier: res.tariff, expires: res.expires };
    },
    [updateSubscription],
  );

  const active = isActiveNow(sub);
  const isBasic = active && sub.tier === 'basic';
  const isVip = active && sub.tier === 'vip';
  const isBoxActive = isBasic || isVip;
  const isPremiumOnly = active && sub.tier === 'premium';
  const isPremium = isPremiumOnly || isBoxActive;
  const subscriptionType: SubscriptionType = !active
    ? 'none'
    : sub.tier === 'vip'
      ? 'vip_box'
      : sub.tier === 'basic'
        ? 'basic_box'
        : sub.tier === 'premium'
          ? 'premium'
          : 'none';

  return {
    subscription: sub,
    tier: sub.tier,
    subscriptionType,
    isActive: active,
    isBasic,
    isVip,
    isPremium,
    isBoxActive,
    daysLeft: computeDaysLeft(sub),
    activate,
  };
};
