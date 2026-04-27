import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseISO } from 'date-fns';
import { useApp } from '../AppContext';
import { computeCycleStats } from '../cycle';
import { tArray } from '../i18n';

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
  colors: ReturnType<typeof useApp>['colors'];
}> = ({ label, value, colors }) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useApp>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    h1: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    muted: { color: colors.textMuted, fontSize: 14 },
    statRow: { flexDirection: 'row', marginBottom: 12 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    historyDate: { color: colors.text, fontSize: 14 },
    historyLen: { color: colors.textMuted, fontSize: 14 },
  });
