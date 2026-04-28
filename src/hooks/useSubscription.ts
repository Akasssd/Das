import { useCallback, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Subscription, SubscriptionTier } from '../types';
import {
  cancelSubscription,
  daysLeft as computeDaysLeft,
  isActive as computeIsActive,
  redeemCode,
} from '../utils/activation';

export interface UseSubscriptionApi {
  subscription: Subscription;
  tier: SubscriptionTier;
  isActive: boolean;
  isBasic: boolean;
  isVip: boolean;
  daysLeft: number;
  /** Try to redeem an activation code (e.g. DEMO123). Persists on success. */
  activate: (code: string) => Promise<{ ok: boolean; error?: 'empty' | 'invalid' }>;
  /** Reset subscription back to free. */
  cancel: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionApi => {
  const { data, updateSubscription } = useApp();
  const sub = data.subscription;

  // Auto-downgrade on expiry the next time the screen renders. Storage's
  // normalize() handles this on cold start; this covers long-running sessions.
  useEffect(() => {
    if (sub.tier !== 'free' && sub.renewsAt && !computeIsActive(sub)) {
      void updateSubscription({ ...cancelSubscription() });
    }
  }, [sub, updateSubscription]);

  const activate = useCallback(
    async (code: string) => {
      const res = redeemCode(code);
      if (!res.ok) return { ok: false, error: res.error };
      await updateSubscription(res.subscription);
      return { ok: true };
    },
    [updateSubscription],
  );

  const cancel = useCallback(async () => {
    await updateSubscription(cancelSubscription());
  }, [updateSubscription]);

  const active = computeIsActive(sub);

  return {
    subscription: sub,
    tier: sub.tier,
    isActive: active,
    isBasic: active && sub.tier === 'basic',
    isVip: active && sub.tier === 'vip',
    daysLeft: computeDaysLeft(sub),
    activate,
    cancel,
  };
};
