import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseISO } from 'date-fns';
import { useApp } from '../AppContext';
import { computeCycleStats } from '../cycle';
import { tArray } from '../i18n';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';

export const StatsScreen: React.FC = () => {
  const { data, colors, t, language } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const stats = useMemo(
    () => computeCycleStats(data.logs, data.settings),
    [data.logs, data.settings],
  );
  void language;
  const months = tArray('monthsGenitive');
  const fmtDate = (iso: string): string => {
    const d = parseISO(iso);
    const m = months[d.getMonth()] ?? '';
    return `${d.getDate()} ${m} ${d.getFullYear()}`;
  };

  const hasData = stats.cycleLengths.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('stats.title')}</Text>

        {!hasData && (
          <View style={styles.card}>
            <Text style={styles.muted}>{t('stats.noData')}</Text>
          </View>
        )}

        {hasData && (
          <View style={styles.statRow}>
            <StatCard
              label={t('stats.averageCycle')}
              value={`${stats.averageCycleLength ?? '—'} ${t('stats.days')}`}
              colors={colors}
            />
            <StatCard
              label={t('stats.averagePeriod')}
              value={`${stats.averagePeriodLength ?? '—'} ${t('stats.days')}`}
              colors={colors}
            />
          </View>
        )}

        {hasData && (
          <View style={styles.statRow}>
            <StatCard
              label={t('stats.shortest')}
              value={`${stats.shortestCycle ?? '—'} ${t('stats.days')}`}
              colors={colors}
            />
            <StatCard
              label={t('stats.longest')}
              value={`${stats.longestCycle ?? '—'} ${t('stats.days')}`}
              colors={colors}
            />
          </View>
        )}

        {stats.periodStarts.length > 0 && (
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.cardTitle}>{t('stats.history')}</Text>
            {stats.periodStarts
              .slice()
              .reverse()
              .map((start, idx, arr) => {
                const len =
                  idx < arr.length - 1
                    ? stats.cycleLengths[stats.cycleLengths.length - 1 - idx]
                    : null;
                return (
                  <View key={start} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{fmtDate(start)}</Text>
                    <Text style={styles.historyLen}>
                      {len ? `${len} ${t('stats.days')}` : '—'}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  colors: ThemeColors;
}> = ({ label, value, colors }) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingTop: 8 },
    h1: {
      fontSize: 32,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      color: colors.primary,
      marginBottom: 16,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '600',
    },
    muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    statRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    statValue: {
      color: colors.primary,
      fontSize: 26,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    historyDate: { color: colors.text, fontSize: 14, fontFamily: SERIF_STACK },
    historyLen: { color: colors.textMuted, fontSize: 14 },
  });
