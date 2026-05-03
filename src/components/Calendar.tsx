import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
} from 'date-fns';
import { useApp } from '../AppContext';
import { buildDayMarkers, DayMarker, fmt } from '../cycle';
import { tArray } from '../i18n';

interface Props {
  monthOffset: number;
  onChangeMonthOffset: (n: number) => void;
  onSelectDay: (date: string) => void;
}

const buildMonthGrid = (anchor: Date): (Date | null)[] => {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const startDow = (start.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= end.getDate(); d++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export const CalendarView: React.FC<Props> = ({
  monthOffset,
  onChangeMonthOffset,
  onSelectDay,
}) => {
  const { data, predictions, colors, t, language } = useApp();
  const today = new Date();
  const anchor = addMonths(today, monthOffset);
  const cells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const markers = useMemo(
    () => buildDayMarkers(data.logs, predictions, data.settings, today),
    [data.logs, predictions, data.settings, today, language],
  );

  const months = tArray('months');
  const weekdays = tArray('weekdays');
  const monthLabel = `${months[anchor.getMonth()] ?? ''} ${anchor.getFullYear()}`;

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onChangeMonthOffset(monthOffset - 1)}
          style={styles.navBtn}
          accessibilityLabel="Previous month"
        >
          <Text style={styles.navBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={() => onChangeMonthOffset(monthOffset + 1)}
          style={styles.navBtn}
          accessibilityLabel="Next month"
        >
          <Text style={styles.navBtnText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {weekdays.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }
          const dateStr = fmt(cell);
          const dayMarkers = markers[dateStr] ?? [];
          const isToday = isSameDay(cell, today);
          const hasOvulation = dayMarkers.includes('ovulation');
          const hasFertile = dayMarkers.includes('fertile');
          const hasPredicted = dayMarkers.includes('predictedPeriod');
          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDay(dateStr)}
              style={[
                styles.cell,
                dayCellStyle(dayMarkers, colors, isToday),
                hasFertile && styles.fertileCell,
                hasOvulation && {
                  borderColor: colors.ovulation,
                  borderWidth: 2,
                  backgroundColor: colors.ovulation,
                  shadowColor: colors.ovulation,
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                },
                hasPredicted && !hasOvulation && styles.ringCell,
              ]}
              accessibilityLabel={dateStr}
            >
              <Text style={dayTextStyle(dayMarkers, colors, isToday)}>
                {cell.getDate()}
              </Text>
              <View style={styles.dotsRow}>
                {dayMarkers.includes('logged') && !dayMarkers.includes('period') && (
                  <View
                    style={[styles.dot, { backgroundColor: colors.accent }]}
                  />
                )}
                {hasFertile && !hasOvulation && (
                  <View
                    style={[styles.dot, { backgroundColor: colors.fertile }]}
                  />
                )}
                {hasOvulation && (
                  <View
                    style={[styles.dot, { backgroundColor: colors.primary }]} 
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Legend colors={colors} t={t} />
    </View>
  );
};

const dayCellStyle = (
  markers: DayMarker[],
  colors: ReturnType<typeof useApp>['colors'],
  isToday: boolean,
) => {
  if (markers.includes('period')) {
    return { backgroundColor: colors.period };
  }
  if (markers.includes('predictedPeriod')) {
    return {
      backgroundColor: 'transparent',
      borderColor: '#D64545',
      borderWidth: 2,
      borderRadius: 999,
    };
  }
  if (markers.includes('fertile')) {
    return {
      backgroundColor: colors.fertile,
      borderColor: colors.fertile,
      borderWidth: 1,
    };
  }
  if (isToday) {
    return { borderColor: colors.today, borderWidth: 1 };
  }
  return null;
};

const dayTextStyle = (
  markers: DayMarker[],
  colors: ReturnType<typeof useApp>['colors'],
  isToday: boolean,
) => {
  if (markers.includes('period')) {
    return { color: colors.primaryText, fontWeight: '700' as const };
  }
  if (markers.includes('ovulation')) {
    return { color: colors.text, fontWeight: '800' as const };
  }
  if (markers.includes('predictedPeriod')) {
    return { color: '#D64545', fontWeight: '700' as const };
  }
  if (markers.includes('fertile')) {
    return { color: colors.text, fontWeight: '700' as const };
  }
  if (isToday) {
    return { color: colors.today, fontWeight: '700' as const };
  }
  return { color: colors.text };
};

interface LegendProps {
  colors: ReturnType<typeof useApp>['colors'];
  t: (key: string) => string;
}

const Legend: React.FC<LegendProps> = ({ colors, t }) => {
  const styles = makeStyles(colors);
  const items = [
    { color: colors.period, label: t('home.lastPeriod') },
    { color: '#D64545', label: t('home.nextPeriod'), ring: true },
    { color: colors.fertile, label: t('home.fertileWindow') },
    { color: colors.ovulation, label: t('home.ovulation'), ring: true },
  ];
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                backgroundColor: it.ring ? 'transparent' : it.color,
                borderColor: it.color,
                borderWidth: it.ring ? 2 : 0,
                borderRadius: 999,
              },
            ]}
          />
          <Text style={styles.legendLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useApp>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    navBtnText: { fontSize: 22, color: colors.text, lineHeight: 24 },
    monthLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekday: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      marginVertical: 2,
    },
    fertileCell: {
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    ringCell: {
      borderRadius: 12,
    },
    dotsRow: {
      flexDirection: 'row',
      marginTop: 2,
      minHeight: 6,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginHorizontal: 1,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      marginBottom: 4,
    },
    legendSwatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: 6,
    },
    legendLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
