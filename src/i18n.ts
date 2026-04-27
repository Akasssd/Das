import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const i18n = new I18n({ en, ru });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const detectLocale = (): string => {
  const locales = getLocales();
  const code = locales[0]?.languageCode ?? 'en';
  return code === 'ru' ? 'ru' : 'en';
};

export const setLocale = (pref: 'auto' | 'en' | 'ru') => {
  i18n.locale = pref === 'auto' ? detectLocale() : pref;
};

setLocale('auto');

export const t = (key: string, opts?: Record<string, unknown>): string =>
  i18n.t(key, opts);

export const tArray = (key: string): string[] => {
  const value = i18n.t(key);
  return Array.isArray(value) ? value : [];
};
