import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../AppContext';
import { CalendarView } from '../components/Calendar';
import { RootStackParamList } from '../navigation';
import { parseISO } from 'date-fns';
import { tArray } from '../i18n';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, predictions, t, language } = useApp();
  const [monthOffset, setMonthOffset] = useState(0);
  const styles = makeStyles(colors);
  void language;
  const months = tArray('monthsGenitive');
  const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    const d = parseISO(iso);
    const m = months[d.getMonth()] ?? '';
    return `${d.getDate()} ${m}`;
  };

  const renderHero = () => {
    if (!predictions.lastPeriodStart) {
      return (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t('home.noDataTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('home.noDataBody')}</Text>
        </View>
      );
    }
    const days = predictions.daysUntilNextPeriod ?? 0;
    let primary: string;
    if (days === 0) {
      primary = t('home.periodToday');
    } else if (days < 0) {
      primary = t('home.periodLate', { n: Math.abs(days) });
    } else {
      primary = `${days} ${t('home.daysUntilPeriod')}`;
    }
    return (
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>
          {t('home.cycleDay')} {predictions.cycleDay ?? ''}
        </Text>
        <Text style={styles.heroTitle}>{primary}</Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroLabel}>{t('home.nextPeriod')}</Text>
            <Text style={styles.heroValue}>{fmtDate(predictions.nextPeriodStart)}</Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={styles.heroLabel}>{t('home.ovulation')}</Text>
            <Text style={styles.heroValue}>{fmtDate(predictions.ovulation)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderHero()}
        <CalendarView
          monthOffset={monthOffset}
          onChangeMonthOffset={setMonthOffset}
          onSelectDay={(date) =>
            navigation.navigate('DayDetail', { date })
          }
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 24 },
    hero: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1,
    },
    heroEyebrow: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: colors.primary,
      fontSize: 30,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      marginBottom: 4,
    },
    heroSubtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    heroDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    heroRow: { flexDirection: 'row' },
    heroCell: { flex: 1 },
    heroLabel: {
      color: colors.textMuted,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    heroValue: {
      color: colors.text,
      fontSize: 16,
      fontFamily: SERIF_STACK,
    },
  });
