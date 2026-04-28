import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import { ProductInfo, listProducts } from '../utils/revenuecat';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const SubscriptionScreen: React.FC = () => {
  const { colors, t } = useApp();
  const { subscription, purchase, restore } = useSubscription();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listProducts().then((p) => {
      if (mounted) setProducts(p);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const onBuy = async (productId: string) => {
    setBusy(productId);
    const res = await purchase(productId);
    setBusy(null);
    if (!res.ok) {
      Alert.alert(t('subscription.purchaseFailedTitle'), res.error ?? '');
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (product?.tier === 'vip') {
      navigation.navigate('Address');
    } else {
      navigation.navigate('ManageSubscription');
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    const res = await restore();
    setBusy(null);
    if (!res.ok) {
      Alert.alert(t('subscription.restoreFailedTitle'), res.error ?? '');
      return;
    }
    Alert.alert(t('subscription.restoreOkTitle'));
  };

  const premiumBenefits = [
    t('subscription.benefitPremium1'),
    t('subscription.benefitPremium2'),
    t('subscription.benefitPremium3'),
    t('subscription.benefitPremium4'),
  ];
  const vipBenefits = [
    t('subscription.benefitVip1'),
    t('subscription.benefitVip2'),
    t('subscription.benefitVip3'),
    t('subscription.benefitVip4'),
    t('subscription.benefitVip5'),
  ];

  const renderCard = (
    product: ProductInfo,
    benefits: string[],
    accent: string,
    label: string,
    highlight = false,
  ) => {
    const isCurrent = subscription.tier === product.tier && !subscription.cancelled;
    return (
      <View
        key={product.id}
        style={[
          styles.card,
          highlight && { borderColor: accent, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: accent }]}>{label}</Text>
          {isCurrent ? (
            <View style={[styles.badge, { backgroundColor: accent }]}>
              <Text style={styles.badgeText}>{t('subscription.current')}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: accent }]}>
            {product.priceLabel}
          </Text>
          <Text style={styles.period}>{product.periodLabel}</Text>
        </View>
        <View style={styles.benefits}>
          {benefits.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitDot, { backgroundColor: accent }]} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.cta, { backgroundColor: accent }]}
          onPress={() => onBuy(product.id)}
          disabled={busy !== null || isCurrent}
        >
          {busy === product.id ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.ctaText}>
              {isCurrent
                ? t('subscription.activeCta')
                : t('subscription.subscribeCta')}
            </Text>
          )}
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

        {products
          .filter((p) => p.tier === 'premium')
          .map((p) =>
            renderCard(p, premiumBenefits, colors.primary, t('subscription.premiumLabel')),
          )}
        {products
          .filter((p) => p.tier === 'vip')
          .map((p) =>
            renderCard(p, vipBenefits, '#B5704A', t('subscription.vipLabel'), true),
          )}

        <Pressable style={styles.linkBtn} onPress={onRestore} disabled={busy !== null}>
          <Text style={styles.linkText}>
            {busy === 'restore' ? '…' : t('subscription.restore')}
          </Text>
        </Pressable>

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
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
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
      borderRadius: 999,
      alignItems: 'center',
    },
    ctaText: { color: '#FFFCF7', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
    linkBtn: { alignItems: 'center', paddingVertical: 12 },
    linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
