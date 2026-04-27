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
import { format, parseISO } from 'date-fns';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { colors, predictions, t } = useApp();
  const [monthOffset, setMonthOffset] = useState(0);
  const styles = makeStyles(colors);

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
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroLabel}>{t('home.nextPeriod')}</Text>
            <Text style={styles.heroValue}>
              {predictions.nextPeriodStart
                ? format(parseISO(predictions.nextPeriodStart), 'd MMM')
                : '—'}
            </Text>
          </View>
          <View style={styles.heroCell}>
            <Text style={styles.heroLabel}>{t('home.ovulation')}</Text>
            <Text style={styles.heroValue}>
              {predictions.ovulation
                ? format(parseISO(predictions.ovulation), 'd MMM')
                : '—'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

const makeStyles = (colors: ReturnType<typeof useApp>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 24 },
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 22,
      padding: 20,
      marginBottom: 16,
    },
    heroEyebrow: {
      color: colors.primaryText,
      opacity: 0.85,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
      letterSpacing: 0.4,
    },
    heroTitle: {
      color: colors.primaryText,
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 12,
    },
    heroSubtitle: {
      color: colors.primaryText,
      opacity: 0.9,
      fontSize: 14,
    },
    heroRow: { flexDirection: 'row' },
    heroCell: { flex: 1 },
    heroLabel: {
      color: colors.primaryText,
      opacity: 0.85,
      fontSize: 12,
      marginBottom: 2,
    },
    heroValue: {
      color: colors.primaryText,
      fontSize: 16,
      fontWeight: '700',
    },
  });
