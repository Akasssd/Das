import { useSubscription } from './useSubscription';

/**
 * Convenience hook for VIP-only gating. Returns true when the active
 * subscription is the VIP tier.
 */
export const useVIP = (): boolean => useSubscription().isVip;
