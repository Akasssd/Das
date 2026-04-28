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

/**
 * Telegram bot handles payment + delivery onboarding.
 *
 * Flow expected from the bot side:
 *   1. /start subscription — shows tariff buttons (Basic 999₽, VIP 1999₽).
 *   2. Bot collects shipping address and box preferences (hygiene types,
 *      allergies, diet, care items) inside the bot — the app does NOT have
 *      these forms.
 *   3. Bot accepts payment (e.g. via Telegram Payments / YooKassa).
 *   4. Bot generates a one-time activation code (BASIC-XXXX or VIP-XXXX) and
 *      sends it back to the user.
 *   5. The user pastes the code into the «Код активации» field below to
 *      unlock the corresponding tier locally for 30 days.
 */
const TELEGRAM_BOT_URL = 'https://t.me/FlowCareBot?start=subscription';

interface Tariff {
  id: 'basic' | 'vip';
  title: string;
  price: string;
  period: string;
  features: string[];
  accent: string;
  highlight: boolean;
}

export const SubscriptionScreen: React.FC = () => {
  const { colors, t, language } = useApp();
  const { subscription, tier, isActive, daysLeft, activate } = useSubscription();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [code, setCode] = useState('');
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

  const tariffs: Tariff[] = [
    {
      id: 'basic',
      title: t('subscription.basicLabel'),
      price: t('subscription.basicPrice'),
      period: t('subscription.perMonth'),
      features: [
        t('subscription.basicFeat1'),
        t('subscription.basicFeat2'),
        t('subscription.basicFeat3'),
      ],
      accent: colors.primary,
      highlight: false,
    },
    {
      id: 'vip',
      title: t('subscription.vipLabel'),
      price: t('subscription.vipPrice'),
      period: t('subscription.perMonth'),
      features: [
        t('subscription.vipFeat1'),
        t('subscription.vipFeat2'),
        t('subscription.vipFeat3'),
        t('subscription.vipFeat4'),
        t('subscription.vipFeat5'),
        t('subscription.vipFeat6'),
      ],
      accent: '#B5704A',
      highlight: true,
    },
  ];

  const onOpenBot = () => {
    Linking.openURL(TELEGRAM_BOT_URL).catch(() => {
      Alert.alert(t('subscription.botUnavailableTitle'), TELEGRAM_BOT_URL);
    });
  };

  const onActivate = async () => {
    const trimmed = code.trim();
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
    setCode('');
    Alert.alert(t('subscription.activatedTitle'), t('subscription.activatedBody'));
  };

  const renderTariffCard = (tariff: Tariff) => {
    const isCurrent = isActive && tier === tariff.id;
    return (
      <View
        key={tariff.id}
        style={[
          styles.card,
          tariff.highlight && { borderColor: tariff.accent, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: tariff.accent }]}>
            {tariff.title}
          </Text>
          {isCurrent ? (
            <View style={[styles.badge, { backgroundColor: tariff.accent }]}>
              <Text style={styles.badgeText}>{t('subscription.current')}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: tariff.accent }]}>
            {tariff.price}
          </Text>
          <Text style={styles.period}>{tariff.period}</Text>
        </View>
        <View style={styles.benefits}>
          {tariff.features.map((f, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitDot, { backgroundColor: tariff.accent }]} />
              <Text style={styles.benefitText}>{f}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.cta, { backgroundColor: tariff.accent }]}
          onPress={onOpenBot}
          disabled={isCurrent}
        >
          <Text style={styles.ctaText}>
            {isCurrent ? t('subscription.activeCta') : t('subscription.subscribeCta')}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('subscription.title')}</Text>
        <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

        {isActive ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>{t('subscription.activeBanner')}</Text>
            <Text style={styles.statusTier}>
              {tier === 'vip' ? t('subscription.vipLabel') : t('subscription.basicLabel')}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusKey}>{t('subscription.expires')}</Text>
              <Text style={styles.statusVal}>{fmtDate(subscription.renewsAt)}</Text>
            </View>
            <Text style={styles.statusHint}>
              {t('subscription.daysLeft', { n: daysLeft })}
            </Text>
            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary, marginTop: 14 }]}
              onPress={() => navigation.navigate('ManageSubscription')}
            >
              <Text style={styles.ctaText}>{t('subscription.manage')}</Text>
            </Pressable>
          </View>
        ) : null}

        {tariffs.map(renderTariffCard)}

        <View style={styles.codeBlock}>
          <Text style={styles.codeTitle}>{t('subscription.codeTitle')}</Text>
          <Text style={styles.codeHint}>{t('subscription.codeHint')}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={t('subscription.codePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
          />
          <Pressable
            style={[
              styles.cta,
              { backgroundColor: colors.primary },
              busy ? { opacity: 0.6 } : null,
            ]}
            onPress={onActivate}
            disabled={busy}
          >
            <Text style={styles.ctaText}>{t('subscription.activate')}</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>{t('subscription.disclaimer')}</Text>
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
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 6,
      marginBottom: 20,
      lineHeight: 20,
    },
    statusCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginBottom: 20,
    },
    statusLabel: {
      color: colors.textMuted,
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    statusTier: {
      color: colors.primary,
      fontFamily: SERIF_STACK,
      fontSize: 26,
      marginTop: 4,
      fontWeight: '600',
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    statusKey: { color: colors.textMuted, fontSize: 13 },
    statusVal: { color: colors.text, fontSize: 13, fontWeight: '600' },
    statusHint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontFamily: SERIF_STACK,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: { color: '#FFFCF7', fontSize: 11, fontWeight: '700' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
    price: { fontSize: 28, fontWeight: '700' },
    period: { color: colors.textMuted, marginLeft: 4, fontSize: 14 },
    benefits: { marginTop: 14, gap: 8 },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    benefitDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
    benefitText: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 19 },
    cta: {
      marginTop: 18,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
    },
    ctaText: {
      color: '#FFFCF7',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    codeBlock: {
      marginTop: 8,
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
    codeHint: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 6,
      lineHeight: 18,
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
