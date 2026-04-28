import { useCallback } from 'react';
import { useApp } from '../AppContext';
import { Subscription, SubscriptionTier } from '../types';
import {
  markCancelled,
  purchaseProduct as rcPurchase,
  restorePurchases as rcRestore,
} from '../utils/revenuecat';

export interface UseSubscriptionApi {
  subscription: Subscription;
  tier: SubscriptionTier;
  isPremium: boolean;
  isVip: boolean;
  purchase: (productId: string) => Promise<{ ok: boolean; error?: string }>;
  restore: () => Promise<{ ok: boolean; error?: string }>;
  cancel: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionApi => {
  const { data, updateSubscription } = useApp();
  const sub = data.subscription;

  const purchase = useCallback(
    async (productId: string) => {
      const res = await rcPurchase(productId);
      if (!res.ok) return { ok: false, error: res.errorMessage };
      if (res.subscription) {
        await updateSubscription(res.subscription);
      }
      return { ok: true };
    },
    [updateSubscription],
  );

  const restore = useCallback(async () => {
    const res = await rcRestore();
    if (!res.ok) return { ok: false, error: res.errorMessage };
    if (res.subscription) {
      await updateSubscription(res.subscription);
    }
    return { ok: true };
  }, [updateSubscription]);

  const cancel = useCallback(async () => {
    await updateSubscription(markCancelled(sub));
  }, [sub, updateSubscription]);

  return {
    subscription: sub,
    tier: sub.tier,
    isPremium: sub.tier === 'premium' || sub.tier === 'vip',
    isVip: sub.tier === 'vip',
    purchase,
    restore,
    cancel,
  };
};
