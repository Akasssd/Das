import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DEFAULT_SETTINGS, DayLog, Settings } from './types';

const STORAGE_KEY = '@cycle-tracker/data/v1';

export const loadData = async (): Promise<AppData> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { logs: {}, settings: { ...DEFAULT_SETTINGS } };
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      logs: parsed.logs ?? {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch (e) {
    console.warn('Failed to load data', e);
    return { logs: {}, settings: { ...DEFAULT_SETTINGS } };
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
  };
  await saveData(data);
  return data;
};

export const clearData = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

export type { AppData, DayLog, Settings };
