// Thin RevenueCat adapter. The app currently runs in demo mode: purchases
// are simulated locally so the UI is fully exercised. When `react-native-
// purchases` is installed and the API keys are wired through `app.config.ts`
// (`extra.revenueCatIos` / `extra.revenueCatAndroid`), this module switches to
// the real SDK without any UI changes.
//
// Required app.config.ts extra keys (when going live):
//   extra: {
//     revenueCatIos: 'appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
//     revenueCatAndroid: 'goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
//   }

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Subscription, SubscriptionTier } from '../types';

export interface ProductInfo {
  id: string;
  tier: SubscriptionTier;
  /** Display price including currency symbol, e.g. "$4.99" or "299 ₽". */
  priceLabel: string;
  /** Renewal interval label, e.g. "/мес". */
  periodLabel: string;
}

const DEMO_PRODUCTS: ProductInfo[] = [
  { id: 'premium_monthly', tier: 'premium', priceLabel: '299 ₽', periodLabel: '/мес' },
  { id: 'vip_monthly', tier: 'vip', priceLabel: '1 990 ₽', periodLabel: '/мес' },
];

const getApiKey = (): string | null => {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    revenueCatIos?: string;
    revenueCatAndroid?: string;
  };
  if (Platform.OS === 'ios' && extra.revenueCatIos) return extra.revenueCatIos;
  if (Platform.OS === 'android' && extra.revenueCatAndroid)
    return extra.revenueCatAndroid;
  return null;
};

export const isRevenueCatAvailable = (): boolean => {
  if (Platform.OS === 'web') return false;
  if (!getApiKey()) return false;
  // The native module is installed lazily; if the import fails we stay in demo.
  try {
    require.resolve('react-native-purchases');
    return true;
  } catch {
    return false;
  }
};

let initialized = false;
export const initRevenueCat = async (userId?: string): Promise<void> => {
  if (initialized) return;
  if (!isRevenueCatAvailable()) {
    initialized = true;
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const apiKey = getApiKey();
    if (!apiKey) return;
    Purchases.configure({ apiKey, appUserID: userId });
    initialized = true;
  } catch (e) {
    console.warn('RevenueCat init failed, staying in demo mode', e);
  }
};

export const listProducts = async (): Promise<ProductInfo[]> => {
  // Demo mode: return static prices.
  return DEMO_PRODUCTS;
};

const monthFromNow = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

export interface PurchaseResult {
  ok: boolean;
  subscription?: Partial<Subscription>;
  errorMessage?: string;
}

/**
 * Purchase a product. In demo mode, succeeds locally and returns a synthetic
 * subscription state. When wired to real RC, calls `Purchases.purchaseProduct`.
 */
export const purchaseProduct = async (
  productId: string,
): Promise<PurchaseResult> => {
  const product = DEMO_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return { ok: false, errorMessage: 'Unknown product' };
  }
  if (!isRevenueCatAvailable()) {
    return {
      ok: true,
      subscription: {
        tier: product.tier,
        productId: product.id,
        startedAt: new Date().toISOString(),
        renewsAt: monthFromNow(),
        cancelled: false,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const result = await Purchases.purchaseProduct(productId);
    const entitlement =
      result?.customerInfo?.entitlements?.active?.[product.tier];
    return {
      ok: true,
      subscription: {
        tier: entitlement ? product.tier : 'free',
        productId: product.id,
        startedAt: entitlement?.originalPurchaseDate ?? new Date().toISOString(),
        renewsAt: entitlement?.expirationDate ?? monthFromNow(),
        cancelled: false,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return {
      ok: false,
      errorMessage: e instanceof Error ? e.message : 'Purchase failed',
    };
  }
};

export const restorePurchases = async (): Promise<PurchaseResult> => {
  if (!isRevenueCatAvailable()) {
    return { ok: true, subscription: {} };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const info = await Purchases.restorePurchases();
    const active = info?.entitlements?.active ?? {};
    const tier: SubscriptionTier = active.vip
      ? 'vip'
      : active.premium
        ? 'premium'
        : 'free';
    return {
      ok: true,
      subscription: {
        tier,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return {
      ok: false,
      errorMessage: e instanceof Error ? e.message : 'Restore failed',
    };
  }
};

/**
 * Cancel locally — actual cancellation is handled by the system store
 * settings, but we mark the local copy as cancelled so the UI shows it.
 */
export const markCancelled = (sub: Subscription): Partial<Subscription> => ({
  ...sub,
  cancelled: true,
  lastSyncedAt: new Date().toISOString(),
});
