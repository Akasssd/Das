/**
 * Bot → app sync client.
 *
 * The Lira app generates a stable per-install `device_id`, opens the
 * Telegram deep-link `t.me/<bot>?start=app_<device_id>` for the user to
 * confirm the bind, then long-polls `/v1/sync/pull?device_id=...` to
 * pull the current Telegram subscription + cycle data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { SubscriptionTier } from '../types';

const DEVICE_ID_STORAGE_KEY = '@lira/sync/device-id/v1';

const fallbackBase = 'https://flowcare-api.example.com';
const fallbackBotUsername = 'lowerBsk24_bot';

const readExtra = (key: string): string | null => {
  const fromExtra =
    (Constants?.expoConfig?.extra as Record<string, unknown> | undefined)?.[key] ??
    (Constants?.manifest2?.extra as Record<string, unknown> | undefined)?.[key];
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
  return null;
};

export const syncApiBaseUrl = (): string =>
  readExtra('syncApiUrl') ??
  readExtra('activationApiUrl') ??
  fallbackBase;

export const botUsername = (): string =>
  readExtra('telegramBotUsername') ?? fallbackBotUsername;

const randomHex = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i += 1) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const newDeviceId = (): string => `dev-${randomHex(8)}`;

export const getDeviceId = async (): Promise<string> => {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.length >= 6) return existing;
  } catch {
    // fallthrough — generate a fresh id
  }
  const id = newDeviceId();
  try {
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  } catch {
    /* non-fatal — we still return the in-memory id */
  }
  return id;
};

export const buildBotDeepLink = (deviceId: string): string =>
  `https://t.me/${botUsername()}?start=app_${encodeURIComponent(deviceId)}`;

export interface SyncedSubscription {
  tariff: SubscriptionTier;
  started_at: string;
  renews_at: string;
  status: string;
}

export interface SyncedCycle {
  last_period_start: string;
  cycle_length_days: number | null;
  period_length_days: number | null;
}

export interface SyncPullResponse {
  linked: boolean;
  telegram_user_id?: number | null;
  telegram_username?: string | null;
  subscription?: SyncedSubscription | null;
  cycle?: SyncedCycle | null;
  synced_at?: string | null;
}

/**
 * Strip embedded `user:password@` credentials from a URL (browsers reject
 * them in `fetch()`) and surface them as a Basic auth header instead.
 */
const splitAuth = (
  raw: string,
): { url: string; auth: string | null } => {
  try {
    const parsed = new URL(raw);
    if (!parsed.username && !parsed.password) {
      return { url: raw.replace(/\/$/, ''), auth: null };
    }
    const user = decodeURIComponent(parsed.username);
    const pass = decodeURIComponent(parsed.password);
    parsed.username = '';
    parsed.password = '';
    const cleaned = parsed.toString().replace(/\/$/, '');
    const token =
      typeof globalThis.btoa === 'function'
        ? globalThis.btoa(`${user}:${pass}`)
        : Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
    return { url: cleaned, auth: `Basic ${token}` };
  } catch {
    return { url: raw.replace(/\/$/, ''), auth: null };
  }
};

export const pullSync = async (
  deviceId: string,
): Promise<SyncPullResponse | null> => {
  const { url: base, auth } = splitAuth(syncApiBaseUrl());
  const url = `${base}/v1/sync/pull?device_id=${encodeURIComponent(deviceId)}`;
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = auth;
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) return null;
    return (await res.json()) as SyncPullResponse;
  } catch {
    return null;
  }
};

export const clearDeviceBinding = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
