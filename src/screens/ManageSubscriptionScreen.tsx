import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  Platform,
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
import { useSubscription } from '../hooks/useSubscription';
import { useBoxDelivery } from '../hooks/useBoxDelivery';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ManageSubscriptionScreen: React.FC = () => {
  const { colors, t, language } = useApp();
  const { subscription, cancel, restore } = useSubscription();
  const { hasAddress, hasBoxProfile } = useBoxDelivery();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'd MMM yyyy', {
        locale: language === 'ru' ? ru : enUS,
      });
    } catch {
      return iso;
    }
  };

  const onCancel = () => {
    Alert.alert(
      t('manage.cancelTitle'),
      t('manage.cancelBody'),
      [
        { text: t('manage.keep'), style: 'cancel' },
        {
          text: t('manage.cancelConfirm'),
          style: 'destructive',
          onPress: async () => {
            await cancel();
            const url =
              Platform.OS === 'ios'
                ? 'https://apps.apple.com/account/subscriptions'
                : 'https://play.google.com/store/account/subscriptions';
            Linking.openURL(url).catch(() => undefined);
          },
        },
      ],
    );
  };

  const onRestore = async () => {
    const res = await restore();
    if (!res.ok) {
      Alert.alert(t('subscription.restoreFailedTitle'), res.error ?? '');
      return;
    }
    Alert.alert(t('subscription.restoreOkTitle'));
  };

  const tierLabel =
    subscription.tier === 'vip'
      ? t('subscription.vipLabel')
      : subscription.tier === 'premium'
        ? t('subscription.premiumLabel')
        : t('manage.tierFree');

  const isVip = subscription.tier === 'vip';
  const isFree = subscription.tier === 'free';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('manage.title')}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('manage.currentTier')}</Text>
          <Text style={styles.tier}>{tierLabel}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('manage.startedAt')}</Text>
            <Text style={styles.rowValue}>{fmtDate(subscription.startedAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {subscription.cancelled ? t('manage.endsAt') : t('manage.renewsAt')}
            </Text>
            <Text style={styles.rowValue}>{fmtDate(subscription.renewsAt)}</Text>
          </View>
          {subscription.cancelled ? (
            <Text style={styles.cancelledHint}>{t('manage.cancelledHint')}</Text>
          ) : null}
        </View>

        {isFree ? (
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.ctaText}>{t('manage.viewPlans')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.cta, styles.ctaGhost]}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={[styles.ctaText, { color: colors.primary }]}>
              {t('manage.changePlan')}
            </Text>
          </Pressable>
        )}

        {isVip ? (
          <>
            <Pressable
              style={styles.cta}
              onPress={() => navigation.navigate('Address')}
            >
              <Text style={styles.ctaText}>
                {hasAddress
                  ? t('manage.editAddress')
                  : t('manage.fillAddress')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.cta,
                hasBoxProfile ? styles.ctaGhost : null,
              ]}
              onPress={() => navigation.navigate('BoxCustomization')}
            >
              <Text
                style={[
                  styles.ctaText,
                  hasBoxProfile ? { color: colors.primary } : null,
                ]}
              >
                {hasBoxProfile
                  ? t('manage.editBoxProfile')
                  : t('manage.setupBox')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.cta, styles.ctaGhost]}
              onPress={() => navigation.navigate('OrderStatus')}
            >
              <Text style={[styles.ctaText, { color: colors.primary }]}>
                {t('manage.orderStatus')}
              </Text>
            </Pressable>
          </>
        ) : null}

        {!isFree && !subscription.cancelled ? (
          <Pressable
            style={[styles.cta, { backgroundColor: colors.danger }]}
            onPress={onCancel}
          >
            <Text style={styles.ctaText}>{t('manage.cancel')}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.linkBtn} onPress={onRestore}>
          <Text style={styles.linkText}>{t('subscription.restore')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
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
      marginBottom: 16,
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tier: {
      color: colors.primary,
      fontSize: 22,
      fontWeight: '700',
      marginTop: 4,
      marginBottom: 12,
      fontFamily: SERIF_STACK,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    rowLabel: { color: colors.textMuted, fontSize: 13 },
    rowValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
    cancelledHint: {
      color: colors.danger,
      fontSize: 12.5,
      marginTop: 10,
      lineHeight: 17,
    },
    cta: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
      marginTop: 10,
    },
    ctaGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ctaText: { color: '#FFFCF7', fontSize: 15, fontWeight: '700' },
    linkBtn: { alignItems: 'center', paddingVertical: 16 },
    linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
