import { ColorSchemeName } from 'react-native';

export interface ThemeColors {
  background: string;
  card: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  period: string;
  predictedPeriod: string;
  ovulation: string;
  fertile: string;
  today: string;
  danger: string;
  accent: string;
}

export const lightColors: ThemeColors = {
  background: '#FFF7F8',
  card: '#FFFFFF',
  surface: '#FDEEF1',
  text: '#1F1227',
  textMuted: '#6B5C68',
  border: '#F1D9DF',
  primary: '#E94B7B',
  primaryText: '#FFFFFF',
  period: '#E94B7B',
  predictedPeriod: '#F8B4C5',
  ovulation: '#7F5BD6',
  fertile: '#C9B8F0',
  today: '#1F1227',
  danger: '#D14343',
  accent: '#7F5BD6',
};

export const darkColors: ThemeColors = {
  background: '#150C18',
  card: '#22152A',
  surface: '#2C1A36',
  text: '#FBE9EE',
  textMuted: '#B7A2B0',
  border: '#3A2244',
  primary: '#FF6E9C',
  primaryText: '#1F1227',
  period: '#FF6E9C',
  predictedPeriod: '#7A3450',
  ovulation: '#B49BFF',
  fertile: '#4A3B70',
  today: '#FBE9EE',
  danger: '#FF7575',
  accent: '#B49BFF',
};

export const resolveColors = (
  pref: 'auto' | 'light' | 'dark',
  system: ColorSchemeName,
): ThemeColors => {
  const mode = pref === 'auto' ? system ?? 'light' : pref;
  return mode === 'dark' ? darkColors : lightColors;
};
