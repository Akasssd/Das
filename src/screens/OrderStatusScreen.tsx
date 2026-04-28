import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';

import { useApp } from '../AppContext';
import { useBoxDelivery } from '../hooks/useBoxDelivery';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import { BoxOrder } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const OrderStatusScreen: React.FC = () => {
  const { colors, t, language } = useApp();
  const { eligible, hasAddress, orders, activeOrder } = useBoxDelivery();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const fmtDate = (iso: string) => {
    try {
      return format(parseISO(iso), 'd MMMM yyyy', {
        locale: language === 'ru' ? ru : enUS,
      });
    } catch {
      return iso;
    }
  };

  const sorted = useMemo(
    () =>
      [...orders].sort((a, b) =>
        a.shipDate < b.shipDate ? 1 : a.shipDate > b.shipDate ? -1 : 0,
      ),
    [orders],
  );

  if (!eligible) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <WaveBackground colors={colors} />
        <View style={styles.empty}>
          <Text style={styles.h1}>{t('order.title')}</Text>
          <Text style={styles.emptyText}>{t('order.notVip')}</Text>
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.ctaText}>{t('order.upgradeCta')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAddress) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <WaveBackground colors={colors} />
        <View style={styles.empty}>
          <Text style={styles.h1}>{t('order.title')}</Text>
          <Text style={styles.emptyText}>{t('order.noAddress')}</Text>
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('Address')}
          >
            <Text style={styles.ctaText}>{t('order.fillAddressCta')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('order.title')}</Text>

        {activeOrder ? (
          <View style={[styles.card, styles.cardActive]}>
            <Text style={styles.cardLabel}>{t('order.upcoming')}</Text>
            <Text style={styles.shipDate}>{fmtDate(activeOrder.shipDate)}</Text>
            <Text style={styles.subline}>
              {t('order.estimatedArrival')}: {fmtDate(activeOrder.estimatedDelivery)}
            </Text>
            <View style={[styles.statusPill, statusColor(activeOrder.status, colors)]}>
              <Text style={styles.statusText}>
                {t(`order.status.${activeOrder.status}`)}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t('order.history')}</Text>
        {sorted.length === 0 ? (
          <Text style={styles.emptyHint}>{t('order.empty')}</Text>
        ) : (
          sorted.map((o) => <OrderRow key={o.id} order={o} colors={colors} fmtDate={fmtDate} t={t} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const OrderRow: React.FC<{
  order: BoxOrder;
  colors: ThemeColors;
  fmtDate: (iso: string) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}> = ({ order, colors, fmtDate, t }) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{fmtDate(order.shipDate)}</Text>
        <Text style={styles.rowSub}>
          {t('order.cycleAnchor')}: {fmtDate(order.cycleAnchor)}
        </Text>
      </View>
      <View style={[styles.statusPill, statusColor(order.status, colors)]}>
        <Text style={styles.statusText}>{t(`order.status.${order.status}`)}</Text>
      </View>
    </View>
  );
};

const statusColor = (
  status: BoxOrder['status'],
  colors: ThemeColors,
): { backgroundColor: string } => {
  switch (status) {
    case 'shipped':
      return { backgroundColor: colors.primary };
    case 'delivered':
      return { backgroundColor: '#7BA77B' };
    case 'cancelled':
      return { backgroundColor: colors.danger };
    default:
      return { backgroundColor: colors.fertile };
  }
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    empty: { padding: 24, gap: 16 },
    emptyText: {
      color: colors.text,
      fontSize: 14.5,
      lineHeight: 21,
    },
    h1: {
      fontSize: 30,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      color: colors.primary,
      marginTop: 8,
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 18,
    },
    cardActive: { borderColor: colors.primary, borderWidth: 1.5 },
    cardLabel: {
      color: colors.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    shipDate: {
      fontSize: 24,
      fontFamily: SERIF_STACK,
      color: colors.primary,
      marginTop: 6,
      fontWeight: '700',
    },
    subline: { color: colors.text, fontSize: 13.5, marginTop: 6 },
    statusPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 12,
    },
    statusText: { color: '#FFFCF7', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptyHint: {
      color: colors.textMuted,
      fontSize: 13,
      paddingVertical: 16,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      gap: 10,
    },
    rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
    rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    cta: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
      marginTop: 6,
    },
    ctaText: { color: '#FFFCF7', fontSize: 15, fontWeight: '700' },
  });
