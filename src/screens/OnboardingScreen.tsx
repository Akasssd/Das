import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { useApp } from '../AppContext';
import { ThemeColors } from '../theme';
import { hashPin } from '../pin';
import { tArray } from '../i18n';

const SERIF =
  'Cochin, "Hoefler Text", "Times New Roman", Georgia, serif';

type Step =
  | 'welcome'
  | 'name'
  | 'birthdate'
  | 'pin'
  | 'lastPeriod'
  | 'periodLength'
  | 'cycleLength'
  | 'done';

const STEP_ORDER: Step[] = [
  'welcome',
  'name',
  'birthdate',
  'pin',
  'lastPeriod',
  'periodLength',
  'cycleLength',
  'done',
];

interface Props {
  onComplete: () => void;
  initialStep?: Step;
  /** Skip profile-related steps and only run cycle calibration. */
  cycleOnly?: boolean;
}

export const OnboardingScreen: React.FC<Props> = ({
  onComplete,
  initialStep,
  cycleOnly = false,
}) => {
  const {
    colors,
    t,
    data,
    upsertLog,
    updateSettings,
    updateProfile,
    setOnboardingDone,
  } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const steps: Step[] = cycleOnly
    ? ['lastPeriod', 'periodLength', 'cycleLength', 'done']
    : STEP_ORDER;
  const [stepIdx, setStepIdx] = useState(() => {
    if (initialStep) return Math.max(0, steps.indexOf(initialStep));
    return 0;
  });
  const step = steps[stepIdx] ?? 'done';

  const [name, setName] = useState(data.profile.name);
  const [birthYear, setBirthYear] = useState(
    data.profile.birthdate ? data.profile.birthdate.slice(0, 4) : '',
  );
  const [birthMonth, setBirthMonth] = useState(
    data.profile.birthdate ? data.profile.birthdate.slice(5, 7) : '',
  );
  const [birthDay, setBirthDay] = useState(
    data.profile.birthdate ? data.profile.birthdate.slice(8, 10) : '',
  );
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [lastPeriod, setLastPeriod] = useState<string | null>(null);
  const [periodLen, setPeriodLen] = useState(data.settings.averagePeriodLength);
  const [cycleLen, setCycleLen] = useState(data.settings.averageCycleLength);
  const [monthOffset, setMonthOffset] = useState(0);
  const [pinError, setPinError] = useState<string | null>(null);

  const goNext = async () => {
    if (step === 'done') {
      // Persist everything and exit
      if (!cycleOnly) {
        const birthdate =
          birthYear && birthMonth && birthDay
            ? `${birthYear.padStart(4, '0')}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
            : null;
        await updateProfile({
          name: name.trim(),
          birthdate,
          pinHash: pin && pin === pin2 ? hashPin(pin) : data.profile.pinHash,
        });
      }
      await updateSettings({
        averagePeriodLength: periodLen,
        averageCycleLength: cycleLen,
      });
      if (lastPeriod) {
        // Mark last period day as flow=medium so predictions kick in.
        await upsertLog({ date: lastPeriod, flow: 'medium' });
      }
      await setOnboardingDone(true);
      onComplete();
      return;
    }
    if (step === 'pin' && pin.length > 0) {
      if (pin.length < 4) {
        setPinError(t('onboarding.pinTooShort'));
        return;
      }
      if (pin !== pin2) {
        setPinError(t('onboarding.pinMismatch'));
        return;
      }
    }
    setPinError(null);
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));
  const skipPin = () => {
    setPin('');
    setPin2('');
    setPinError(null);
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 'name':
        return name.trim().length > 0;
      case 'birthdate':
        // Birthdate is optional but if any field set, all must be set & valid
        if (!birthYear && !birthMonth && !birthDay) return true;
        return Boolean(
          birthYear &&
            birthMonth &&
            birthDay &&
            Number(birthYear) >= 1900 &&
            Number(birthYear) <= 2025 &&
            Number(birthMonth) >= 1 &&
            Number(birthMonth) <= 12 &&
            Number(birthDay) >= 1 &&
            Number(birthDay) <= 31,
        );
      case 'pin':
        return true; // pin is optional; if filled, validation runs in goNext
      case 'lastPeriod':
        return Boolean(lastPeriod);
      default:
        return true;
    }
  };

  const renderProgress = () => {
    const progress = ((stepIdx + 1) / steps.length) * 100;
    return (
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <View style={styles.centered}>
            <Text style={styles.bigSerif}>{t('onboarding.welcomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.welcomeBody')}</Text>
          </View>
        );
      case 'name':
        return (
          <View>
            <Text style={styles.stepTitle}>{t('onboarding.nameTitle')}</Text>
            <Text style={styles.stepHint}>{t('onboarding.nameHint')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('onboarding.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="words"
              autoFocus
            />
          </View>
        );
      case 'birthdate':
        return (
          <View>
            <Text style={styles.stepTitle}>{t('onboarding.birthdateTitle')}</Text>
            <Text style={styles.stepHint}>{t('onboarding.birthdateHint')}</Text>
            <View style={styles.dateRow}>
              <TextInput
                value={birthDay}
                onChangeText={(v) => setBirthDay(v.replace(/\D/g, '').slice(0, 2))}
                placeholder="ДД"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.dateInput]}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                value={birthMonth}
                onChangeText={(v) =>
                  setBirthMonth(v.replace(/\D/g, '').slice(0, 2))
                }
                placeholder="ММ"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.dateInput]}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                value={birthYear}
                onChangeText={(v) => setBirthYear(v.replace(/\D/g, '').slice(0, 4))}
                placeholder="ГГГГ"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.dateInputYear]}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        );
      case 'pin':
        return (
          <View>
            <Text style={styles.stepTitle}>{t('onboarding.pinTitle')}</Text>
            <Text style={styles.stepHint}>{t('onboarding.pinHint')}</Text>
            <TextInput
              value={pin}
              onChangeText={(v) => {
                setPin(v.replace(/\D/g, '').slice(0, 6));
                setPinError(null);
              }}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <TextInput
              value={pin2}
              onChangeText={(v) => {
                setPin2(v.replace(/\D/g, '').slice(0, 6));
                setPinError(null);
              }}
              placeholder={t('onboarding.pinConfirm')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { marginTop: 12 }]}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <Pressable style={styles.skipBtn} onPress={skipPin}>
              <Text style={styles.skipBtnText}>{t('onboarding.skip')}</Text>
            </Pressable>
          </View>
        );
      case 'lastPeriod':
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('onboarding.lastPeriodTitle')}
            </Text>
            <Text style={styles.stepHint}>
              {t('onboarding.lastPeriodHint')}
            </Text>
            <MiniCalendar
              colors={colors}
              monthOffset={monthOffset}
              onChangeMonthOffset={setMonthOffset}
              selected={lastPeriod}
              onSelect={setLastPeriod}
            />
          </View>
        );
      case 'periodLength':
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('onboarding.periodLengthTitle')}
            </Text>
            <Text style={styles.stepHint}>
              {t('onboarding.periodLengthHint')}
            </Text>
            <Counter
              value={periodLen}
              min={2}
              max={10}
              suffix={t('onboarding.daysSuffix')}
              colors={colors}
              onChange={setPeriodLen}
            />
          </View>
        );
      case 'cycleLength':
        return (
          <View>
            <Text style={styles.stepTitle}>
              {t('onboarding.cycleLengthTitle')}
            </Text>
            <Text style={styles.stepHint}>
              {t('onboarding.cycleLengthHint')}
            </Text>
            <Counter
              value={cycleLen}
              min={21}
              max={40}
              suffix={t('onboarding.daysSuffix')}
              colors={colors}
              onChange={setCycleLen}
            />
            <Text style={styles.tip}>{t('onboarding.cycleLengthTip')}</Text>
          </View>
        );
      case 'done':
        return (
          <View style={styles.centered}>
            <Text style={styles.bigSerif}>{t('onboarding.doneTitle')}</Text>
            <Text style={styles.subtitle}>
              {cycleOnly
                ? t('onboarding.doneBodyCycleOnly')
                : t('onboarding.doneBody', { name: name.trim() })}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderProgress()}
          <View style={styles.stepBox}>{renderStep()}</View>
        </ScrollView>

        <View style={styles.footer}>
          {stepIdx > 0 && step !== 'done' ? (
            <Pressable style={styles.backBtn} onPress={goBack}>
              <Text style={styles.backBtnText}>{t('onboarding.back')}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            style={[
              styles.nextBtn,
              !canAdvance() && { opacity: 0.4 },
            ]}
            onPress={goNext}
            disabled={!canAdvance()}
          >
            <Text style={styles.nextBtnText}>
              {step === 'done'
                ? t('onboarding.finish')
                : step === 'welcome'
                  ? t('onboarding.start')
                  : t('onboarding.next')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Counter: React.FC<{
  value: number;
  min: number;
  max: number;
  suffix: string;
  colors: ThemeColors;
  onChange: (n: number) => void;
}> = ({ value, min, max, suffix, colors, onChange }) => {
  const styles = makeStyles(colors);
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.counterRow}>
      <Pressable style={styles.counterBtn} onPress={dec}>
        <Text style={styles.counterBtnText}>−</Text>
      </Pressable>
      <View style={styles.counterValueBox}>
        <Text style={styles.counterValue}>{value}</Text>
        <Text style={styles.counterSuffix}>{suffix}</Text>
      </View>
      <Pressable style={styles.counterBtn} onPress={inc}>
        <Text style={styles.counterBtnText}>+</Text>
      </Pressable>
    </View>
  );
};

const buildMonthGrid = (anchor: Date): (Date | null)[] => {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const startDow = (start.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i += 1) cells.push(null);
  for (let d = 1; d <= end.getDate(); d += 1) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const MiniCalendar: React.FC<{
  colors: ThemeColors;
  monthOffset: number;
  onChangeMonthOffset: (n: number) => void;
  selected: string | null;
  onSelect: (iso: string) => void;
}> = ({ colors, monthOffset, onChangeMonthOffset, selected, onSelect }) => {
  const styles = makeStyles(colors);
  const today = new Date();
  const anchor = addMonths(today, monthOffset);
  const cells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const months = tArray('months');
  const weekdays = tArray('weekdays');
  const monthLabel = `${months[anchor.getMonth()] ?? ''} ${anchor.getFullYear()}`;
  const selectedDate = selected ? parseISO(selected) : null;
  return (
    <View style={styles.calBox}>
      <View style={styles.calHeader}>
        <Pressable
          style={styles.calNav}
          onPress={() => onChangeMonthOffset(monthOffset - 1)}
        >
          <Text style={styles.calNavText}>‹</Text>
        </Pressable>
        <Text style={styles.calMonth}>{monthLabel}</Text>
        <Pressable
          style={styles.calNav}
          onPress={() => {
            // Don't allow going past current month
            if (monthOffset < 0) onChangeMonthOffset(monthOffset + 1);
          }}
        >
          <Text style={[styles.calNavText, monthOffset >= 0 && { opacity: 0.3 }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calWeekRow}>
        {weekdays.map((w) => (
          <Text key={w} style={styles.calWeek}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.calCellEmpty} />;
          const iso = format(d, 'yyyy-MM-dd');
          const isFuture = isAfter(d, today);
          const isSelected =
            selectedDate &&
            d.getDate() === selectedDate.getDate() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getFullYear() === selectedDate.getFullYear();
          return (
            <Pressable
              key={iso}
              disabled={isFuture}
              onPress={() => onSelect(iso)}
              style={[
                styles.calCell,
                isSelected && {
                  backgroundColor: colors.period,
                  borderColor: colors.period,
                },
                isFuture && { opacity: 0.25 },
              ]}
            >
              <Text
                style={[
                  styles.calCellText,
                  isSelected && { color: colors.primaryText, fontWeight: '700' },
                ]}
              >
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scrollContent: {
      padding: 24,
      paddingBottom: 40,
      flexGrow: 1,
    },
    progressTrack: {
      height: 4,
      backgroundColor: colors.ringTrack,
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: 32,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    stepBox: { flex: 1 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 40,
    },
    bigSerif: {
      fontSize: 40,
      lineHeight: 46,
      color: colors.text,
      fontFamily: SERIF,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 16,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textMuted,
      textAlign: 'center',
      maxWidth: 320,
    },
    stepTitle: {
      fontSize: 28,
      fontFamily: SERIF,
      color: colors.text,
      marginBottom: 8,
    },
    stepHint: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
      marginBottom: 24,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 18,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateRow: { flexDirection: 'row', gap: 8 },
    dateInput: { flex: 1, textAlign: 'center' },
    dateInputYear: { flex: 1.4, textAlign: 'center' },
    errorText: {
      color: colors.danger,
      marginTop: 8,
      fontSize: 14,
    },
    skipBtn: { marginTop: 16, alignSelf: 'flex-start', padding: 8 },
    skipBtnText: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'underline' },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 24,
    },
    counterBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterBtnText: { fontSize: 28, color: colors.primary, fontWeight: '600' },
    counterValueBox: {
      flex: 1,
      alignItems: 'center',
    },
    counterValue: {
      fontSize: 56,
      fontFamily: SERIF,
      color: colors.text,
      lineHeight: 64,
    },
    counterSuffix: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    tip: {
      marginTop: 24,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 24,
      paddingBottom: 16,
      paddingTop: 8,
    },
    backBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    backBtnText: { color: colors.text, fontSize: 16, fontWeight: '500' },
    nextBtn: {
      flex: 2,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    nextBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
    calBox: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    calNav: { padding: 8 },
    calNavText: { fontSize: 24, color: colors.text },
    calMonth: { fontSize: 16, fontWeight: '600', color: colors.text },
    calWeekRow: { flexDirection: 'row', marginBottom: 4 },
    calWeek: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCellEmpty: { width: `${100 / 7}%`, aspectRatio: 1 },
    calCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    calCellText: { color: colors.text, fontSize: 14 },
  });
