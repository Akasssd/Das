import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';

import { useApp } from '../AppContext';
import { DEFAULT_SUBSCRIPTION, DayLog } from '../types';
import {
  SyncPullResponse,
  buildBotDeepLink,
  getDeviceId,
  pullSync,
} from '../utils/sync';

export type SyncStatus =
  | 'idle'
  | 'awaiting-bind'
  | 'linked'
  | 'error';

export interface UseTelegramSyncApi {
  deviceId: string | null;
  status: SyncStatus;
  lastResponse: SyncPullResponse | null;
  /** Open the bot deep link so the user can confirm the bind in Telegram. */
  openBotDeepLink: () => Promise<void>;
  /** Force a pull right now. Returns the latest payload (or null on failure). */
  refresh: () => Promise<SyncPullResponse | null>;
  /** Drop the persisted device id (e.g. on log-out). */
  reset: () => Promise<void>;
}

const POLL_FAST_MS = 4_000;
const POLL_SLOW_MS = 60_000;

const flowFromTariff = (tariff: string): DayLog['flow'] | undefined =>
  tariff === 'premium' || tariff === 'basic' || tariff === 'vip' ? 'medium' : undefined;

/**
 * Hook that owns the bot↔app one-way sync state.
 *
 * Lifecycle:
 *  1. Loads (or generates) a stable `device_id` from AsyncStorage.
 *  2. Polls /v1/sync/pull every few seconds until linked, then slows down.
 *  3. When a payload arrives, mirrors subscription + cycle data into local
 *     storage via AppContext mutators.
 */
export const useTelegramSync = (): UseTelegramSyncApi => {
  const { updateSubscription, upsertLog, updateSettings, data } = useApp();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastResponse, setLastResponse] = useState<SyncPullResponse | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // 1) Load (or create) the per-install device id.
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const id = await getDeviceId();
      if (!mounted) return;
      setDeviceId(id);
      setStatus('awaiting-bind');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const applyPayload = useCallback(
    async (payload: SyncPullResponse) => {
      if (!payload.linked) {
        setStatus('awaiting-bind');
        return;
      }
      // Avoid re-applying the same snapshot back-to-back.
      const stamp = payload.synced_at ?? null;
      if (stamp && stamp === lastSyncedAtRef.current) {
        setStatus('linked');
        return;
      }
      lastSyncedAtRef.current = stamp;

      const sub = payload.subscription ?? null;
      if (sub) {
        const productId =
          sub.tariff === 'vip'
            ? 'vip_monthly'
            : sub.tariff === 'basic'
              ? 'basic_monthly'
              : sub.tariff === 'premium'
                ? 'premium_monthly'
                : null;
        await updateSubscription({
          tier: sub.tariff,
          productId,
          startedAt: sub.started_at,
          renewsAt: sub.renews_at,
          cancelled: sub.status !== 'active',
          lastSyncedAt: new Date().toISOString(),
          activationCode: null,
        });
      } else {
        await updateSubscription({ ...DEFAULT_SUBSCRIPTION });
      }

      const cycle = payload.cycle ?? null;
      if (cycle && cycle.last_period_start) {
        const settingsPatch: Partial<typeof dataRef.current.settings> = {};
        if (cycle.cycle_length_days)
          settingsPatch.averageCycleLength = cycle.cycle_length_days;
        if (cycle.period_length_days)
          settingsPatch.averagePeriodLength = cycle.period_length_days;
        if (Object.keys(settingsPatch).length > 0) {
          await updateSettings(settingsPatch);
        }
        // Seed a single period-start log if the user has no overlap yet.
        const startIso = cycle.last_period_start;
        const flow = flowFromTariff(sub?.tariff ?? 'premium');
        const existing = dataRef.current.logs[startIso];
        if (flow && (!existing || !existing.flow)) {
          await upsertLog({ ...(existing ?? { date: startIso }), date: startIso, flow });
        }
      }
      setStatus('linked');
    },
    [updateSubscription, upsertLog, updateSettings],
  );

  const refresh = useCallback(async () => {
    if (!deviceId) return null;
    const payload = await pullSync(deviceId);
    if (payload === null) {
      setStatus((s) => (s === 'linked' ? 'linked' : 'error'));
      return null;
    }
    setLastResponse(payload);
    await applyPayload(payload);
    return payload;
  }, [deviceId, applyPayload]);

  // 2) Polling loop — fast until linked, slow afterwards.
  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (cancelled) return;
      const payload = await pullSync(deviceId);
      if (cancelled) return;
      if (payload !== null) {
        setLastResponse(payload);
        await applyPayload(payload);
      }
      const linked = payload?.linked === true;
      const delay = linked ? POLL_SLOW_MS : POLL_FAST_MS;
      timer = setTimeout(tick, delay);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [deviceId, applyPayload]);

  // 3) Refresh on app foreground (helps after returning from Telegram).
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refresh]);

  const openBotDeepLink = useCallback(async () => {
    if (!deviceId) return;
    const url = buildBotDeepLink(deviceId);
    try {
      await Linking.openURL(url);
    } catch {
      /* propagate to caller if needed */
    }
  }, [deviceId]);

  const reset = useCallback(async () => {
    const { clearDeviceBinding } = await import('../utils/sync');
    await clearDeviceBinding();
    lastSyncedAtRef.current = null;
    setLastResponse(null);
    setStatus('idle');
    const id = await getDeviceId();
    setDeviceId(id);
    setStatus('awaiting-bind');
  }, []);

  return useMemo(
    () => ({ deviceId, status, lastResponse, openBotDeepLink, refresh, reset }),
    [deviceId, status, lastResponse, openBotDeepLink, refresh, reset],
  );
};
