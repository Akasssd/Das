import { ColorSchemeName } from 'react-native';

export interface ThemeColors {
  mode: 'light' | 'dark';
  background: string;
  backgroundAccent: string;
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
  follicular: string;
  luteal: string;
  ringTrack: string;
  today: string;
  danger: string;
  accent: string;
}

export const lightColors: ThemeColors = {
  mode: 'light',
  background: '#FBF6EF',
  backgroundAccent: '#F4EADB',
  card: '#FFFCF7',
  surface: '#F6ECDD',
  text: '#8E6F58',
  textMuted: '#B59C84',
  border: '#F1E2CB',
  primary: '#C99275',
  primaryText: '#FFFFFF',
  period: '#D9A39F',
  predictedPeriod: '#EDC9BC',
  ovulation: '#C99275',
  fertile: '#E8C4A8',
  follicular: '#F1DDC4',
  luteal: '#EBD9C2',
  ringTrack: '#F1E1CC',
  today: '#8C6B53',
  danger: '#B5704A',
  accent: '#C99275',
};

export const darkColors: ThemeColors = {
  mode: 'dark',
  background: '#1B130C',
  backgroundAccent: '#2A1D11',
  card: '#26190F',
  surface: '#2F2014',
  text: '#F2E1CC',
  textMuted: '#B49E83',
  border: '#3D2C1D',
  primary: '#E8B58D',
  primaryText: '#1B130C',
  period: '#E89993',
  predictedPeriod: '#5A3E33',
  ovulation: '#E8B58D',
  fertile: '#A87B5C',
  follicular: '#5C4536',
  luteal: '#553D2C',
  ringTrack: '#3A2A1D',
  today: '#F4D6B4',
  danger: '#E08962',
  accent: '#E8B58D',
};

export const resolveColors = (
  pref: 'auto' | 'light' | 'dark',
  system: ColorSchemeName,
): ThemeColors => {
  const mode = pref === 'auto' ? system ?? 'light' : pref;
  return mode === 'dark' ? darkColors : lightColors;
};
