import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';

import { useApp } from '../AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TELEGRAM_BOT_URL = 'https://t.me/FlowCareBot?start=manage';

export const ManageSubscriptionScreen: React.FC = () => {
  const { colors, t, language } = useApp();
  const { subscription, tier, isActive, daysLeft, activate, cancel } =
    useSubscription();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [renewCode, setRenewCode] = useState('');
  const [showRenew, setShowRenew] = useState(false);
  const [busy, setBusy] = useState(false);

  const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'd MMMM yyyy', {
        locale: language === 'ru' ? ru : enUS,
      });
    } catch {
      return iso;
    }
  };

  const tierLabel =
    tier === 'vip'
      ? t('subscription.vipLabel')
      : tier === 'basic'
        ? t('subscription.basicLabel')
        : t('manage.tierFree');

  const onCancel = () => {
    Alert.alert(t('manage.cancelTitle'), t('manage.cancelBody'), [
      { text: t('manage.keep'), style: 'cancel' },
      {
        text: t('manage.cancelConfirm'),
        style: 'destructive',
        onPress: async () => {
          await cancel();
          Alert.alert(
            t('manage.cancelledTitle'),
            t('manage.cancelledBody'),
            [
              { text: t('manage.openBot'), onPress: () => Linking.openURL(TELEGRAM_BOT_URL).catch(() => undefined) },
              { text: t('manage.ok'), style: 'cancel' },
            ],
          );
          navigation.goBack();
        },
      },
    ]);
  };

  const onRenew = async () => {
    const trimmed = renewCode.trim();
    if (!trimmed) {
      Alert.alert(t('subscription.codeEmptyTitle'));
      return;
    }
    setBusy(true);
    const res = await activate(trimmed);
    setBusy(false);
    if (!res.ok) {
      Alert.alert(
        t('subscription.codeInvalidTitle'),
        t('subscription.codeInvalidBody'),
      );
      return;
    }
    setRenewCode('');
    setShowRenew(false);
    Alert.alert(t('manage.renewedTitle'), t('manage.renewedBody'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('manage.title')}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('manage.currentTier')}</Text>
          <Text style={styles.tier}>{tierLabel}</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('manage.status')}</Text>
            <Text
              style={[
                styles.rowValue,
                { color: isActive ? colors.primary : colors.textMuted },
              ]}
            >
              {isActive ? t('manage.statusActive') : t('manage.statusExpired')}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('manage.startedAt')}</Text>
            <Text style={styles.rowValue}>{fmtDate(subscription.startedAt)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('manage.expiresAt')}</Text>
            <Text style={styles.rowValue}>{fmtDate(subscription.renewsAt)}</Text>
          </View>

          {isActive ? (
            <Text style={styles.daysLeft}>
              {t('subscription.daysLeft', { n: daysLeft })}
            </Text>
          ) : null}

          {subscription.activationCode ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('manage.code')}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {subscription.activationCode}
              </Text>
            </View>
          ) : null}
        </View>

        {!isActive ? (
          <Pressable
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.ctaText}>{t('manage.viewPlans')}</Text>
          </Pressable>
        ) : null}

        {showRenew ? (
          <View style={styles.codeBlock}>
            <Text style={styles.codeTitle}>{t('manage.renewTitle')}</Text>
            <TextInput
              value={renewCode}
              onChangeText={setRenewCode}
              placeholder={t('subscription.codePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.codeInput}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                style={[
                  styles.ctaInline,
                  { backgroundColor: colors.primary },
                  busy ? { opacity: 0.6 } : null,
                ]}
                onPress={onRenew}
                disabled={busy}
              >
                <Text style={styles.ctaText}>{t('subscription.activate')}</Text>
              </Pressable>
              <Pressable
                style={[styles.ctaInline, styles.ctaGhost]}
                onPress={() => {
                  setShowRenew(false);
                  setRenewCode('');
                }}
              >
                <Text style={[styles.ctaText, { color: colors.primary }]}>
                  {t('manage.keep')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={[styles.cta, styles.ctaGhost]}
            onPress={() => setShowRenew(true)}
          >
            <Text style={[styles.ctaText, { color: colors.primary }]}>
              {t('manage.renew')}
            </Text>
          </Pressable>
        )}

        {isActive ? (
          <Pressable
            style={[styles.cta, { backgroundColor: colors.danger }]}
            onPress={onCancel}
          >
            <Text style={styles.ctaText}>{t('manage.cancel')}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.disclaimer}>{t('manage.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    h1: {
      fontSize: 28,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      color: colors.primary,
      marginTop: 8,
      marginBottom: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    tier: {
      color: colors.primary,
      fontFamily: SERIF_STACK,
      fontSize: 26,
      fontWeight: '600',
      marginTop: 4,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    rowLabel: { color: colors.textMuted, fontSize: 13 },
    rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, marginLeft: 12 },
    daysLeft: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 8,
      fontStyle: 'italic',
    },
    cta: {
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    ctaInline: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
    },
    ctaGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ctaText: {
      color: '#FFFCF7',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    codeBlock: {
      marginTop: 12,
      padding: 18,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      fontFamily: SERIF_STACK,
    },
    codeInput: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      letterSpacing: 1.5,
      color: colors.text,
      backgroundColor: colors.background,
    },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 16,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
