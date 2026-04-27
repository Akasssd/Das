import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  AppData,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  DayLog,
  Profile,
  Settings,
} from './types';
import { loadData, saveData, clearData as clearStorage } from './storage';
import { setLocale, t as translate } from './i18n';
import { ThemeColors, resolveColors } from './theme';
import { computePredictions, CyclePredictions } from './cycle';

interface AppContextValue {
  ready: boolean;
  data: AppData;
  predictions: CyclePredictions;
  colors: ThemeColors;
  // mutations
  upsertLog: (log: DayLog) => Promise<void>;
  removeLog: (date: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  setOnboardingDone: (done: boolean) => Promise<void>;
  replaceData: (next: AppData) => Promise<void>;
  resetAll: () => Promise<void>;
  // i18n helpers tied to language so consumers re-render on change
  t: (key: string, opts?: Record<string, unknown>) => string;
  language: Settings['language'];
}

const AppContext = createContext<AppContextValue | null>(null);

const isLogEmpty = (log: DayLog): boolean => {
  if (log.flow && log.flow !== 'none') return false;
  if (log.symptoms && log.symptoms.length > 0) return false;
  if (log.moods && log.moods.length > 0) return false;
  if (log.temperature !== undefined && !Number.isNaN(log.temperature)) return false;
  if (log.notes && log.notes.trim().length > 0) return false;
  if (log.intimacy) return false;
  return true;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>({
    logs: {},
    settings: { ...DEFAULT_SETTINGS },
    profile: { ...DEFAULT_PROFILE },
    onboardingDone: false,
  });

  useEffect(() => {
    let mounted = true;
    loadData().then((loaded) => {
      if (!mounted) return;
      setLocale(loaded.settings.language);
      setData(loaded);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Keep i18n in sync synchronously during render so the same render that
  // bumps `language` already produces translated strings.
  setLocale(data.settings.language);

  const persist = useCallback(async (next: AppData) => {
    setData(next);
    await saveData(next);
  }, []);

  const upsertLog = useCallback(
    async (log: DayLog) => {
      const next: AppData = { ...data, logs: { ...data.logs } };
      if (isLogEmpty(log)) {
        delete next.logs[log.date];
      } else {
        next.logs[log.date] = log;
      }
      await persist(next);
    },
    [data, persist],
  );

  const removeLog = useCallback(
    async (date: string) => {
      const next: AppData = { ...data, logs: { ...data.logs } };
      delete next.logs[date];
      await persist(next);
    },
    [data, persist],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next: AppData = { ...data, settings: { ...data.settings, ...patch } };
      await persist(next);
    },
    [data, persist],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const next: AppData = { ...data, profile: { ...data.profile, ...patch } };
      await persist(next);
    },
    [data, persist],
  );

  const setOnboardingDone = useCallback(
    async (done: boolean) => {
      const next: AppData = { ...data, onboardingDone: done };
      await persist(next);
    },
    [data, persist],
  );

  const replaceData = useCallback(
    async (next: AppData) => {
      await persist(next);
    },
    [persist],
  );

  const resetAll = useCallback(async () => {
    await clearStorage();
    const fresh: AppData = {
      logs: {},
      settings: { ...DEFAULT_SETTINGS },
      profile: { ...DEFAULT_PROFILE },
      onboardingDone: false,
    };
    setData(fresh);
  }, []);

  const predictions = useMemo(
    () => computePredictions(data.logs, data.settings),
    [data.logs, data.settings],
  );

  const colors = useMemo(
    () => resolveColors(data.settings.theme, system),
    [data.settings.theme, system],
  );

  const language = data.settings.language;
  const t = useCallback(
    (key: string, opts?: Record<string, unknown>) => {
      void language;
      return translate(key, opts);
    },
    [language],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      data,
      predictions,
      colors,
      upsertLog,
      removeLog,
      updateSettings,
      updateProfile,
      setOnboardingDone,
      replaceData,
      resetAll,
      t,
      language,
    }),
    [
      ready,
      data,
      predictions,
      colors,
      upsertLog,
      removeLog,
      updateSettings,
      updateProfile,
      setOnboardingDone,
      replaceData,
      resetAll,
      t,
      language,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
