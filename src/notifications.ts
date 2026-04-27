import { Platform } from 'react-native';
import { addDays, parseISO, startOfDay } from 'date-fns';
import type { CyclePredictions } from './cycle';
import type { Settings } from './types';

// expo-notifications imports must be wrapped because the package is unavailable
// in pure web SSR contexts; we lazy-load it.
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

let cachedNotif: typeof import('expo-notifications') | null = null;
const loadNotif = async (): Promise<typeof import('expo-notifications') | null> => {
  if (!isNative) return null;
  if (cachedNotif) return cachedNotif;
  try {
    cachedNotif = await import('expo-notifications');
    return cachedNotif;
  } catch {
    return null;
  }
};

const TAG = 'cycletracker.scheduled';

export interface NotificationPlan {
  prePeriodAt: Date | null;
  fertileStartAt: Date | null;
}

/** Build the next future-only notification fire times based on the latest
 *  predictions. Uses 09:00 local on the given day. */
export const buildNotificationPlan = (
  predictions: CyclePredictions,
  settings: Settings,
  now: Date = new Date(),
): NotificationPlan => {
  const at9 = (iso: string): Date => {
    const d = startOfDay(parseISO(iso));
    d.setHours(9, 0, 0, 0);
    return d;
  };

  let prePeriodAt: Date | null = null;
  if (settings.notifyPrePeriod && predictions.nextPeriodStart) {
    const fire = addDays(at9(predictions.nextPeriodStart), -1);
    if (fire.getTime() > now.getTime()) prePeriodAt = fire;
  }

  let fertileStartAt: Date | null = null;
  if (settings.notifyFertile && predictions.fertileStart) {
    const fire = at9(predictions.fertileStart);
    if (fire.getTime() > now.getTime()) fertileStartAt = fire;
  }

  return { prePeriodAt, fertileStartAt };
};

export const isNotificationsSupported = (): boolean => isNative;

export interface ScheduleResult {
  ok: boolean;
  reason?: 'unsupported' | 'denied' | 'error';
}

/** Cancel any of our previous reminders and schedule the new ones based on
 *  the latest predictions. Safe to call from a useEffect on every change. */
export const rescheduleNotifications = async (
  predictions: CyclePredictions,
  settings: Settings,
  t: (key: string) => string,
): Promise<ScheduleResult> => {
  const Notif = await loadNotif();
  if (!Notif) return { ok: false, reason: 'unsupported' };

  // If neither toggle is on, just clear any existing ones and bail out.
  const wantsAny = settings.notifyPrePeriod || settings.notifyFertile;
  try {
    const existing = await Notif.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.content.data && (n.content.data as { tag?: string }).tag === TAG) {
        await Notif.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // ignore
  }
  if (!wantsAny) return { ok: true };

  // Ensure permission.
  const perm = await Notif.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted) {
    const req = await Notif.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return { ok: false, reason: 'denied' };

  const plan = buildNotificationPlan(predictions, settings);
  const schedule = async (when: Date, title: string, body: string) => {
    await Notif.scheduleNotificationAsync({
      content: { title, body, data: { tag: TAG } },
      trigger: { type: Notif.SchedulableTriggerInputTypes.DATE, date: when },
    });
  };

  try {
    if (plan.prePeriodAt) {
      await schedule(
        plan.prePeriodAt,
        t('app.title'),
        t('today.cardUntilPeriod') + ' 1 ' + t('today.valueDays').replace('{{n}} ', ''),
      );
    }
    if (plan.fertileStartAt) {
      await schedule(
        plan.fertileStartAt,
        t('app.title'),
        t('today.cardFertileWindow') + ' ' + t('today.innerFertile'),
      );
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
};
