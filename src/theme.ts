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
  // Juicier warm cream-peach palette so the background doesn't fade behind
  // the saturated cycle markers and feels alive on its own.
  mode: 'light',
  background: '#FFF1DD',
  backgroundAccent: '#FFD7B5',
  card: '#FFFAF1',
  surface: '#FFE3C7',
  text: '#7A5A42',
  textMuted: '#B08A6A',
  border: '#F2CFAA',
  primary: '#C9774E',
  primaryText: '#FFFFFF',
  period: '#D26C68',
  predictedPeriod: '#EDB1A6',
  ovulation: '#E69BC1',
  fertile: '#F2C68A',
  follicular: '#F4D3AE',
  luteal: '#EBC5A0',
  ringTrack: '#F2D2B0',
  today: '#7A4F35',
  danger: '#A8542F',
  accent: '#C9774E',
};

export const darkColors: ThemeColors = {
  // "Dim" warm palette — dark mode that still feels cream-tinted, not chocolate.
  mode: 'dark',
  background: '#3A2D22',
  backgroundAccent: '#4A3A2C',
  card: '#473628',
  surface: '#4F3D2D',
  text: '#F4E4CF',
  textMuted: '#C9B299',
  border: '#5A4534',
  primary: '#E8B58D',
  primaryText: '#3A2D22',
  period: '#E5A8A3',
  predictedPeriod: '#7A5A4B',
  ovulation: '#D7B6CC',
  fertile: '#D8BA92',
  follicular: '#7A5E47',
  luteal: '#735540',
  ringTrack: '#5A4534',
  today: '#F4D6B4',
  danger: '#E08962',
  accent: '#E8B58D',
};

export const resolveColors = (
  pref: 'auto' | 'light' | 'dark',
  _system: ColorSchemeName,
): ThemeColors => {
  // "Auto" defaults to the warm light palette — dark mode is opt-in only.
  // Without this, an iPhone in system dark mode flips the whole UI to brown
  // and the warm cream/peach aesthetic disappears.
  if (pref === 'dark') return darkColors;
  return lightColors;
};
