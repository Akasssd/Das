// Optional Firebase Firestore adapter. The app stores all box-related data
// (address, box profile, orders) locally via AsyncStorage. When the
// `@react-native-firebase/app` and `@react-native-firebase/firestore` plugins
// are installed and the app config exposes a Firebase project, the same
// payloads are mirrored to Firestore for cross-device sync.
//
// Required app.config.ts extra keys:
//   extra: {
//     firebaseProjectId: 'your-project-id',
//     firebaseEnabled: true,
//   }
//
// All exported helpers are safe to call even when Firebase isn't available —
// they no-op silently and return null.

import Constants from 'expo-constants';
import { BoxOrder, BoxProfile, ShippingAddress } from '../types';

const isEnabled = (): boolean => {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    firebaseEnabled?: boolean;
  };
  if (!extra.firebaseEnabled) return false;
  try {
    require.resolve('@react-native-firebase/app');
    require.resolve('@react-native-firebase/firestore');
    return true;
  } catch {
    return false;
  }
};

export const isFirebaseAvailable = (): boolean => isEnabled();

const firestore = () => {
  if (!isEnabled()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fb = require('@react-native-firebase/firestore').default;
    return fb();
  } catch (e) {
    console.warn('Firestore unavailable', e);
    return null;
  }
};

export const saveAddress = async (
  userId: string,
  address: ShippingAddress,
): Promise<void> => {
  const db = firestore();
  if (!db || !userId) return;
  try {
    await db.collection('users').doc(userId).set({ address }, { merge: true });
  } catch (e) {
    console.warn('saveAddress failed', e);
  }
};

export const saveBoxProfile = async (
  userId: string,
  profile: BoxProfile,
): Promise<void> => {
  const db = firestore();
  if (!db || !userId) return;
  try {
    await db
      .collection('users')
      .doc(userId)
      .collection('boxProfile')
      .doc('current')
      .set(profile, { merge: true });
  } catch (e) {
    console.warn('saveBoxProfile failed', e);
  }
};

export const saveOrder = async (
  userId: string,
  order: BoxOrder,
): Promise<void> => {
  const db = firestore();
  if (!db || !userId) return;
  try {
    await db
      .collection('users')
      .doc(userId)
      .collection('orders')
      .doc(order.id)
      .set(order, { merge: true });
  } catch (e) {
    console.warn('saveOrder failed', e);
  }
};
