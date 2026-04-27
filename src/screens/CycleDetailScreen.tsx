import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { parseISO } from 'date-fns';
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useApp } from '../AppContext';
import { computeCycleHistory } from '../cycle';
import { tArray } from '../i18n';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import type { RootStackParamList } from '../navigation';

type Route = NativeStackScreenProps<RootStackParamList, 'CycleDetail'>['route'];
type Nav = NativeStackNavigationProp<RootStackParamList, 'CycleDetail'>;

export const CycleDetailScreen: React.FC = () => {
  const { data, colors, t, language } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  void language;

  const start = route.params.start;
  const history = useMemo(
    () => computeCycleHistory(data.logs),
    [data.logs],
  );
  const cycle = history.find((c) => c.start === start);

  const months = tArray('monthsGenitive');
  const fmtDate = (iso: string): string => {
    const d = parseISO(iso);
    return `${d.getDate()} ${months[d.getMonth()] ?? ''} ${d.getFullYear()}`;
  };

  if (!cycle) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <WaveBackground colors={colors} />
        <View style={{ padding: 16 }}>
          <Pressable onPress={() => nav.goBack()}>
            <Text style={styles.backLink}>‹ {t('history.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Aggregate symptoms / moods
  const symptomCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};
  const notes: { date: string; text: string }[] = [];
  const tempPoints: { date: string; t: number }[] = [];
  for (const log of cycle.logs) {
    for (const s of log.symptoms ?? []) {
      symptomCounts[s] = (symptomCounts[s] ?? 0) + 1;
    }
    for (const m of log.moods ?? []) {
      moodCounts[m] = (moodCounts[m] ?? 0) + 1;
    }
    if (log.notes && log.notes.trim()) {
      notes.push({ date: log.date, text: log.notes.trim() });
    }
    if (typeof log.temperature === 'number' && !Number.isNaN(log.temperature)) {
      tempPoints.push({ date: log.date, t: log.temperature });
    }
  }
  const symptomList = Object.entries(symptomCounts).sort(
    (a, b) => b[1] - a[1],
  );
  const moodList = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => nav.goBack()} style={styles.backButton}>
          <Text style={styles.backLink}>‹ {t('history.back')}</Text>
        </Pressable>

        <Text style={styles.h1}>{t('history.detailTitle')}</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroDate}>
            {fmtDate(cycle.start)}
            {cycle.end ? ` → ${fmtDate(cycle.end)}` : ''}
          </Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>
                {cycle.cycleLength !== null
                  ? `${cycle.cycleLength} ${t('history.days')}`
                  : '—'}
              </Text>
              <Text style={styles.heroLabel}>{t('history.cycleLength')}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>
                {cycle.periodLength} {t('history.days')}
              </Text>
              <Text style={styles.heroLabel}>{t('history.periodLength')}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.section}>{t('history.symptomsLogged')}</Text>
        <View style={styles.card}>
          {symptomList.length === 0 ? (
            <Text style={styles.muted}>{t('history.noSymptoms')}</Text>
          ) : (
            symptomList.map(([key, count]) => (
              <View key={key} style={styles.kvRow}>
                <Text style={styles.kvLabel}>{t(`symptoms.${key}`)}</Text>
                <Text style={styles.kvValue}>×{count}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.section}>{t('history.moodsLogged')}</Text>
        <View style={styles.card}>
          {moodList.length === 0 ? (
            <Text style={styles.muted}>—</Text>
          ) : (
            moodList.map(([key, count]) => (
              <View key={key} style={styles.kvRow}>
                <Text style={styles.kvLabel}>{t(`moods.${key}`)}</Text>
                <Text style={styles.kvValue}>×{count}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.section}>{t('history.temperatureChart')}</Text>
        {tempPoints.length >= 2 ? (
          <View style={styles.chartCard}>
            <BBTChart
              points={tempPoints.map((p) => ({
                day:
                  Math.round(
                    (parseISO(p.date).getTime() -
                      parseISO(cycle.start).getTime()) /
                      (1000 * 60 * 60 * 24),
                  ) + 1,
                t: p.t,
              }))}
              colors={colors}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>{t('history.noTemperature')}</Text>
          </View>
        )}

        <Text style={styles.section}>{t('history.notesLogged')}</Text>
        <View style={styles.card}>
          {notes.length === 0 ? (
            <Text style={styles.muted}>{t('history.noNotes')}</Text>
          ) : (
            notes.map((n) => (
              <View key={n.date} style={styles.noteRow}>
                <Text style={styles.noteDate}>{fmtDate(n.date)}</Text>
                <Text style={styles.noteText}>{n.text}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const BBTChart: React.FC<{
  points: { day: number; t: number }[];
  colors: ThemeColors;
}> = ({ points, colors }) => {
  const W = 280;
  const H = 140;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 14;
  const PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const minDay = Math.min(...points.map((p) => p.day));
  const maxDay = Math.max(...points.map((p) => p.day));
  const minT = Math.floor(Math.min(...points.map((p) => p.t)) * 10) / 10 - 0.1;
  const maxT = Math.ceil(Math.max(...points.map((p) => p.t)) * 10) / 10 + 0.1;
  const dayRange = Math.max(1, maxDay - minDay);
  const tRange = Math.max(0.2, maxT - minT);

  const pts = points
    .map((p) => {
      const x = PAD_L + ((p.day - minDay) / dayRange) * innerW;
      const y = PAD_T + innerH - ((p.t - minT) / tRange) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill="transparent" />
      <Line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={PAD_T + innerH}
        y2={PAD_T + innerH}
        stroke={colors.border}
        strokeWidth={1}
      />
      <Polyline points={pts} fill="none" stroke={colors.primary} strokeWidth={2} />
      {points.map((p, i) => {
        const x = PAD_L + ((p.day - minDay) / dayRange) * innerW;
        const y = PAD_T + innerH - ((p.t - minT) / tRange) * innerH;
        return <Circle key={i} cx={x} cy={y} r={3} fill={colors.primary} />;
      })}
      <SvgText
        x={PAD_L - 4}
        y={PAD_T + 8}
        fontSize="10"
        fill={colors.textMuted}
        textAnchor="end"
      >
        {maxT.toFixed(1)}
      </SvgText>
      <SvgText
        x={PAD_L - 4}
        y={PAD_T + innerH}
        fontSize="10"
        fill={colors.textMuted}
        textAnchor="end"
      >
        {minT.toFixed(1)}
      </SvgText>
    </Svg>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingTop: 8 },
    backButton: { paddingVertical: 4, marginBottom: 4 },
    backLink: { color: colors.primary, fontSize: 15 },
    h1: {
      fontSize: 28,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      color: colors.primary,
      marginBottom: 12,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    heroDate: {
      fontSize: 18,
      fontFamily: SERIF_STACK,
      color: colors.text,
      marginBottom: 12,
    },
    heroRow: { flexDirection: 'row', gap: 16 },
    heroStat: { flex: 1 },
    heroValue: {
      fontSize: 22,
      fontFamily: SERIF_STACK,
      color: colors.primary,
    },
    heroLabel: {
      fontSize: 11,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    section: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '600',
      marginTop: 14,
      marginBottom: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    kvRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    kvLabel: { fontSize: 14, color: colors.text },
    kvValue: { fontSize: 14, color: colors.primary, fontWeight: '600' },
    muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
    noteRow: { paddingVertical: 6 },
    noteDate: {
      fontSize: 11,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    noteText: { fontSize: 14, color: colors.text, lineHeight: 19 },
  });
