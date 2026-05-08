import { differenceInCalendarDays, isBefore, parseISO } from 'date-fns';
import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { DEFAULT_SUBSCRIPTION, Subscription, SubscriptionTier } from '../types';

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
 * Source of truth: the Lira Telegram bot. The app pulls the current
 * tariff + renewsAt from `/v1/sync/pull?device_id=...` (handled by
 * `useTelegramSync`) and mirrors it into local storage. This hook is a
 * read-only view over that local mirror.
 */
export const useSubscription = (): UseSubscriptionApi => {
  const { data, updateSubscription } = useApp();
  const sub = data.subscription;

  useEffect(() => {
    if (sub.tier !== 'free' && sub.renewsAt && !isActiveNow(sub)) {
      void updateSubscription({ ...DEFAULT_SUBSCRIPTION });
    }
  }, [sub, updateSubscription]);

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
  };
};
