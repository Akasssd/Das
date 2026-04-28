import { differenceInCalendarDays, isBefore, parseISO } from 'date-fns';
import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { DEFAULT_SUBSCRIPTION, Subscription, SubscriptionTier } from '../types';

export interface UseSubscriptionApi {
  subscription: Subscription;
  tier: SubscriptionTier;
  isActive: boolean;
  isBasic: boolean;
  isVip: boolean;
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
 * Subscription state read-side hook.
 *
 * Source of truth: the Telegram bot (./bot/). For now the app trusts whatever
 * state is in AsyncStorage; in a future iteration `bot/api/<endpoint>` will
 * push tier + renewsAt updates back to the app, replacing the placeholder
 * sync below. The hook auto-downgrades to free when `renewsAt` is past so
 * stale state from a long-running session can't grant unpaid access.
 */
export const useSubscription = (): UseSubscriptionApi => {
  const { data, updateSubscription } = useApp();
  const sub = data.subscription;

  useEffect(() => {
    if (sub.tier !== 'free' && sub.renewsAt && !isActiveNow(sub)) {
      void updateSubscription({ ...DEFAULT_SUBSCRIPTION });
    }
  }, [sub, updateSubscription]);

  // TODO(bot-sync): once the bot exposes a webhook / API, fetch tier &
  // renewsAt for the current Telegram chat_id here and call
  // `updateSubscription({ tier, renewsAt, ... })` to keep the app in sync.

  const active = isActiveNow(sub);

  return {
    subscription: sub,
    tier: sub.tier,
    isActive: active,
    isBasic: active && sub.tier === 'basic',
    isVip: active && sub.tier === 'vip',
    daysLeft: computeDaysLeft(sub),
  };
};
