import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle, Rect } from 'react-native-svg';
import { addDays, parseISO } from 'date-fns';
import { useApp } from '../AppContext';
import { tArray } from '../i18n';
import {
  buildPhaseSegments,
  CyclePhase,
  fertileWindowInfo,
  phaseForCycleDay,
} from '../cycle';
import { ThemeColors } from '../theme';
import { PhaseRing } from '../components/PhaseRing';

const ruDayWord = (n: number): string => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'дней';
  if (b > 1 && b < 5) return 'дня';
  if (b === 1) return 'день';
  return 'дней';
};

const formatDays = (n: number, language: string): string => {
  if (language === 'ru') return `${n} ${ruDayWord(n)}`;
  return n === 1 ? `${n} day` : `${n} days`;
};

const SERIF =
  // Stack of warm, elegant serifs that work on iOS, Android and the web build.
  'Cochin, "Hoefler Text", "Times New Roman", Georgia, serif';

const formatDayMonth = (date: Date, monthsGenitive: string[]): string => {
  const day = date.getDate();
  const month = monthsGenitive[date.getMonth()] ?? '';
  return `${day} ${month}`;
};

const phaseTitleKey = (phase: CyclePhase): string => {
  switch (phase) {
    case 'period':
      return 'today.phasePeriod';
    case 'follicular':
      return 'today.phaseFollicular';
    case 'fertile':
      return 'today.phaseFertile';
    case 'ovulation':
      return 'today.phaseOvulation';
    case 'luteal':
      return 'today.phaseLuteal';
    default:
      return 'today.phaseFollicular';
  }
};

const phaseInnerKey = (phase: CyclePhase): string => {
  switch (phase) {
    case 'period':
      return 'today.innerPeriod';
    case 'follicular':
      return 'today.innerFollicular';
    case 'fertile':
      return 'today.innerFertile';
    case 'ovulation':
      return 'today.innerOvulation';
    case 'luteal':
      return 'today.innerLuteal';
    default:
      return 'today.innerFollicular';
  }
};

const DropIcon: React.FC<{ size: number; colors: ThemeColors }> = ({
  size,
  colors,
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 80">
    <Path
      d="M32 4 C 32 4 8 30 8 50 C 8 64 19 76 32 76 C 45 76 56 64 56 50 C 56 30 32 4 32 4 Z"
      fill={colors.fertile}
      stroke={colors.primary}
      strokeWidth={2}
    />
    <Path
      d="M40 28 L 42 32 L 46 34 L 42 36 L 40 40 L 38 36 L 34 34 L 38 32 Z"
      fill={colors.card}
      opacity={0.85}
    />
    <SvgCircle cx={48} cy={26} r={2} fill={colors.card} opacity={0.9} />
  </Svg>
);

const HeartIcon: React.FC<{ size: number; colors: ThemeColors }> = ({
  size,
  colors,
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path
      d="M32 56 C 32 56 8 40 8 24 C 8 14 16 8 24 8 C 28 8 30 10 32 14 C 34 10 36 8 40 8 C 48 8 56 14 56 24 C 56 40 32 56 32 56 Z"
      fill={colors.fertile}
      stroke={colors.primary}
      strokeWidth={2}
    />
  </Svg>
);

const CalendarIcon: React.FC<{ size: number; colors: ThemeColors }> = ({
  size,
  colors,
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Rect
      x={8}
      y={14}
      width={48}
      height={42}
      rx={6}
      fill={colors.card}
      stroke={colors.primary}
      strokeWidth={2}
    />
    <Rect x={8} y={14} width={48} height={10} rx={6} fill={colors.fertile} />
    <Rect x={18} y={6} width={4} height={12} rx={2} fill={colors.primary} />
    <Rect x={42} y={6} width={4} height={12} rx={2} fill={colors.primary} />
    <Rect x={16} y={30} width={8} height={6} rx={1.5} fill={colors.fertile} />
    <Rect x={28} y={30} width={8} height={6} rx={1.5} fill={colors.fertile} />
    <Rect x={40} y={30} width={8} height={6} rx={1.5} fill={colors.fertile} />
    <Rect x={16} y={40} width={8} height={6} rx={1.5} fill={colors.fertile} />
    <Rect x={28} y={40} width={8} height={6} rx={1.5} fill={colors.primary} />
    <Rect x={40} y={40} width={8} height={6} rx={1.5} fill={colors.fertile} />
  </Svg>
);

const WaveBackground: React.FC<{ colors: ThemeColors }> = ({ colors }) => (
  <Svg
    style={StyleSheet.absoluteFill}
    width="100%"
    height="100%"
    viewBox="0 0 400 800"
    preserveAspectRatio="xMidYMid slice"
  >
    <Path
      d="M0 120 Q 100 60 220 120 T 400 140 L 400 0 L 0 0 Z"
      fill={colors.backgroundAccent}
      opacity={0.45}
    />
    <Path
      d="M0 220 Q 120 160 240 220 T 400 240"
      fill="none"
      stroke={colors.backgroundAccent}
      strokeWidth={1.5}
      opacity={0.5}
    />
    <Path
      d="M0 720 Q 100 660 220 720 T 400 720 L 400 800 L 0 800 Z"
      fill={colors.backgroundAccent}
      opacity={0.45}
    />
    <Path
      d="M-20 540 Q 80 480 200 540 T 420 540"
      fill="none"
      stroke={colors.backgroundAccent}
      strokeWidth={1.5}
      opacity={0.5}
    />
    <Path
      d="M-20 600 Q 100 560 220 600 T 420 580"
      fill="none"
      stroke={colors.backgroundAccent}
      strokeWidth={1}
      opacity={0.4}
    />
  </Svg>
);

export const TodayScreen: React.FC = () => {
  const { data, predictions, colors, t, language } = useApp();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const today = new Date();
  const cycleLen = predictions.effectiveCycleLength;
  const periodLen = predictions.effectivePeriodLength;
  const lutealLen = data.settings.lutealPhaseLength;

  const segments = useMemo(
    () => buildPhaseSegments(cycleLen, periodLen, lutealLen),
    [cycleLen, periodLen, lutealLen],
  );

  const cycleDay = predictions.cycleDay;
  const phase: CyclePhase = cycleDay
    ? phaseForCycleDay(cycleDay, segments)
    : 'unknown';

  // Tap into the language signal to keep month names reactive on locale change.
  void language;

  const monthsGen = tArray('monthsGenitive');
  const dateStr = formatDayMonth(today, monthsGen);

  const fertile = fertileWindowInfo(cycleDay, segments);

  const ringSize = Math.min(width - 64, 320);

  const renderCenter = () => {
    const innerLabel = t(phaseInnerKey(phase));
    const iconSize = ringSize * 0.32;
    return (
      <View style={styles.ringCenter}>
        <DropIcon size={iconSize} colors={colors} />
        <Text
          style={[styles.ringLabel, { fontFamily: SERIF }]}
          numberOfLines={2}
        >
          {innerLabel}
        </Text>
      </View>
    );
  };

  const untilPeriodValue = (() => {
    const days = predictions.daysUntilNextPeriod;
    if (days === null) return '—';
    if (days === 0) return t('today.cardUntilPeriodNow');
    if (days < 0) {
      return language === 'ru'
        ? `Задержка ${formatDays(Math.abs(days), 'ru')}`
        : `Late ${formatDays(Math.abs(days), 'en')}`;
    }
    return formatDays(days, language);
  })();

  const fertileValue = (() => {
    if (predictions.lastPeriodStart === null) return '—';
    if (fertile.isInside) {
      return formatDays(fertile.remaining, language);
    }
    if (fertile.total === 0) return '—';
    if (cycleDay !== null) {
      const nextStart = predictions.fertileStart
        ? parseISO(predictions.fertileStart)
        : null;
      if (nextStart) {
        const diff = Math.ceil(
          (nextStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diff > 0) {
          return language === 'ru'
            ? `через ${formatDays(diff, 'ru')}`
            : `in ${formatDays(diff, 'en')}`;
        }
      }
      return t('today.fertileEnded');
    }
    return formatDays(fertile.total, language);
  })();

  const nextOvulationValue = (() => {
    if (!predictions.ovulation) return '—';
    const ovDate = parseISO(predictions.ovulation);
    // If the ovulation date in `predictions` already passed today, advance by
    // one cycle so the card always shows an upcoming date.
    let target = ovDate;
    if (target.getTime() < today.getTime() - 1000 * 60 * 60 * 24) {
      target = addDays(target, cycleLen);
    }
    return formatDayMonth(target, monthsGen);
  })();

  if (!predictions.lastPeriodStart) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <WaveBackground colors={colors} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerWrap}>
            <Text style={[styles.headerLabel, { fontFamily: SERIF }]}>
              {t('today.header')}
            </Text>
            <View style={styles.divider} />
          </View>
          <View style={styles.dateBlock}>
            <Text style={[styles.bigDate, { fontFamily: SERIF }]}>{dateStr}</Text>
            <Text style={styles.cycleDay}>{t('today.noCycle')}</Text>
            <Text style={styles.phaseLabel}>{t('today.noCycleHint')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <Text style={[styles.headerLabel, { fontFamily: SERIF }]}>
            {t('today.header')}
          </Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.dateBlock}>
          <Text style={[styles.bigDate, { fontFamily: SERIF }]}>{dateStr}</Text>
          <View style={styles.subDivider} />
          {cycleDay !== null && (
            <Text style={styles.cycleDay}>
              {t('today.cycleDay', { n: cycleDay })}
            </Text>
          )}
          <Text style={styles.phaseLabel}>{t(phaseTitleKey(phase))}</Text>
        </View>

        <View style={styles.ringWrap}>
          <PhaseRing
            size={ringSize}
            cycleLen={cycleLen}
            cycleDay={cycleDay}
            segments={segments}
            colors={colors}
          >
            {renderCenter()}
          </PhaseRing>
        </View>

        <View style={styles.cards}>
          <InfoCard
            colors={colors}
            icon={<DropIcon size={28} colors={colors} />}
            label={t('today.cardUntilPeriod')}
            value={untilPeriodValue}
            serif={SERIF}
          />
          <InfoCard
            colors={colors}
            icon={<HeartIcon size={28} colors={colors} />}
            label={t('today.cardFertileWindow')}
            value={fertileValue}
            serif={SERIF}
          />
          <InfoCard
            colors={colors}
            icon={<CalendarIcon size={28} colors={colors} />}
            label={t('today.cardNextOvulation')}
            value={nextOvulationValue}
            serif={SERIF}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoCard: React.FC<{
  colors: ThemeColors;
  icon: React.ReactNode;
  label: string;
  value: string;
  serif: string;
}> = ({ colors, icon, label, value, serif }) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { fontFamily: serif }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 24,
      alignItems: 'center',
    },
    headerWrap: {
      width: '100%',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    headerLabel: {
      fontSize: 18,
      color: colors.textMuted,
      letterSpacing: 1,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      width: '70%',
      marginTop: 12,
    },
    dateBlock: {
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    bigDate: {
      fontSize: 56,
      color: colors.text,
      fontWeight: '300',
      letterSpacing: 0.5,
    },
    subDivider: {
      height: 1,
      backgroundColor: colors.border,
      width: 80,
      marginTop: 8,
      marginBottom: 8,
    },
    cycleDay: {
      fontSize: 18,
      color: colors.textMuted,
      marginBottom: 6,
    },
    phaseLabel: {
      fontSize: 15,
      color: colors.textMuted,
      letterSpacing: 0.6,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    ringWrap: {
      marginVertical: 16,
      alignItems: 'center',
    },
    ringCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    ringLabel: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 0.4,
    },
    cards: {
      flexDirection: 'row',
      width: '100%',
      marginTop: 12,
    },
    infoCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 10,
      marginHorizontal: 4,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    infoIcon: {
      marginBottom: 6,
    },
    infoLabel: {
      fontSize: 11,
      color: colors.textMuted,
      letterSpacing: 0.3,
      textAlign: 'center',
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 18,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
