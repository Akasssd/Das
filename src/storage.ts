import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppData,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  DayLog,
  Profile,
  Settings,
} from './types';

const STORAGE_KEY = '@cycle-tracker/data/v1';

const emptyAppData = (): AppData => ({
  logs: {},
  settings: { ...DEFAULT_SETTINGS },
  profile: { ...DEFAULT_PROFILE },
  onboardingDone: false,
});

export const loadData = async (): Promise<AppData> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAppData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      logs: parsed.logs ?? {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
      onboardingDone: Boolean(parsed.onboardingDone),
    };
  } catch (e) {
    console.warn('Failed to load data', e);
    return emptyAppData();
  }
};

export const saveData = async (data: AppData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save data', e);
  }
};

export const exportData = async (): Promise<string> => {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
};

export const importData = async (json: string): Promise<AppData> => {
  const parsed = JSON.parse(json) as Partial<AppData>;
  const data: AppData = {
    logs: parsed.logs ?? {},
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
    onboardingDone: Boolean(parsed.onboardingDone),
  };
  await saveData(data);
  return data;
};

export const clearData = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

export type { AppData, DayLog, Profile, Settings };
