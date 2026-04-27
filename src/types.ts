export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type SymptomKey =
  | 'cramps'
  | 'headache'
  | 'backache'
  | 'bloating'
  | 'breastTenderness'
  | 'acne'
  | 'fatigue'
  | 'nausea'
  | 'cravings'
  | 'insomnia';

export type MoodKey =
  | 'happy'
  | 'calm'
  | 'sad'
  | 'anxious'
  | 'irritable'
  | 'energetic'
  | 'tired'
  | 'sensitive';

export interface DayLog {
  date: string; // YYYY-MM-DD
  flow?: FlowLevel;
  symptoms?: SymptomKey[];
  moods?: MoodKey[];
  temperature?: number; // basal body temperature in °C
  notes?: string;
  intimacy?: boolean;
}

export interface Settings {
  averageCycleLength: number; // days
  averagePeriodLength: number; // days
  lutealPhaseLength: number; // days, used for ovulation prediction
  language: 'auto' | 'en' | 'ru';
  theme: 'auto' | 'light' | 'dark';
  showFertileWindow: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  lutealPhaseLength: 14,
  language: 'auto',
  theme: 'light',
  showFertileWindow: true,
};

export interface Profile {
  name: string;
  birthdate: string | null; // YYYY-MM-DD
  pinHash: string | null;
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  birthdate: null,
  pinHash: null,
};

export interface AppData {
  logs: Record<string, DayLog>; // keyed by YYYY-MM-DD
  settings: Settings;
  profile: Profile;
  onboardingDone: boolean;
}

export const SYMPTOMS: SymptomKey[] = [
  'cramps',
  'headache',
  'backache',
  'bloating',
  'breastTenderness',
  'acne',
  'fatigue',
  'nausea',
  'cravings',
  'insomnia',
];

export const MOODS: MoodKey[] = [
  'happy',
  'calm',
  'sad',
  'anxious',
  'irritable',
  'energetic',
  'tired',
  'sensitive',
];

export const FLOW_LEVELS: FlowLevel[] = ['none', 'spotting', 'light', 'medium', 'heavy'];
