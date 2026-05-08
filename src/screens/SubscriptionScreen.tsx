import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
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
import { ru } from 'date-fns/locale';
import Svg, { Circle, Path } from 'react-native-svg';

import { useApp } from '../AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { useTelegramSync } from '../hooks/useTelegramSync';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import { buildBotDeepLink } from '../utils/sync';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const BOT_USERNAME = 'lowerBsk24_bot';

type TariffSlug = 'premium' | 'basic' | 'vip' | 'box';

interface TariffSpec {
  slug: TariffSlug;
  badge: string | null;
  badgeTone: 'neutral' | 'hot' | 'gold';
  emoji: string;
  title: string;
  price: string;
  priceSuffix: string;
  tagline: string;
  features: string[];
  bg: string;
  bgAccent: string;
  buttonBg: string;
  buttonText: string;
  textColor: string;
  mutedColor: string;
}

const TARIFFS: TariffSpec[] = [
  {
    slug: 'premium',
    badge: 'Цифровой',
    badgeTone: 'neutral',
    emoji: '✨',
    title: 'Премиум',
    price: '199',
    priceSuffix: '₽/мес',
    tagline: 'Расширенная аналитика без бокса. Без опросника.',
    features: [
      'Графики температуры и симптомов',
      'Детальный прогноз овуляции',
      'Экспорт циклов в PDF / CSV',
      'Персональные гайды и статьи',
    ],
    bg: '#E9DCFB',
    bgAccent: '#C5B0F2',
    buttonBg: '#7B5DD6',
    buttonText: '#FFFFFF',
    textColor: '#2E1F56',
    mutedColor: '#5D4A8A',
  },
  {
    slug: 'basic',
    badge: 'Популярный',
    badgeTone: 'hot',
    emoji: '🌸',
    title: 'Твой ритм',
    price: '999',
    priceSuffix: '₽/мес',
    tagline: 'Премиум + ежемесячный бокс заботы под твой профиль.',
    features: [
      'Всё из «Премиум»',
      'Бокс из 5 предметов под цикл',
      'Гигиена, шоколад, средство ухода',
      'Бесплатная доставка по РФ',
    ],
    bg: '#FBE0CC',
    bgAccent: '#F2A663',
    buttonBg: '#D26C68',
    buttonText: '#FFFFFF',
    textColor: '#52281C',
    mutedColor: '#7A4A3A',
  },
  {
    slug: 'vip',
    badge: 'Максимум',
    badgeTone: 'gold',
    emoji: '💎',
    title: 'Полная симфония',
    price: '1999',
    priceSuffix: '₽/мес',
    tagline: 'Расширенный бокс — органика, чай, гайды, сюрприз.',
    features: [
      'Всё из «Твой ритм»',
      'До 8 предметов + сюрприз',
      'Органика и шоколад ручной работы',
      '3 средства ухода + чай + гайды',
    ],
    bg: '#F6DDB5',
    bgAccent: '#D9A04A',
    buttonBg: '#A0521C',
    buttonText: '#FFFFFF',
    textColor: '#3F2810',
    mutedColor: '#6E4B22',
  },
  {
    slug: 'box',
    badge: null,
    badgeTone: 'neutral',
    emoji: '📦',
    title: 'Мой бокс',
    price: '—',
    priceSuffix: 'статус',
    tagline: 'Уже оформила подписку с боксом? Посмотри статус доставки.',
    features: [
      'Дата ближайшего бокса',
      'Адрес доставки',
      'Статус курьера',
    ],
    bg: '#FCE8DC',
    bgAccent: '#E8B58A',
    buttonBg: '#C9774E',
    buttonText: '#FFFFFF',
    textColor: '#52281C',
    mutedColor: '#7A4A3A',
  },
];

const SparklesIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path
      d="M32 8 L34 26 L52 28 L34 30 L32 48 L30 30 L12 28 L30 26 Z"
      fill={color}
      opacity={0.95}
    />
    <Circle cx={50} cy={14} r={2.5} fill={color} opacity={0.7} />
    <Circle cx={14} cy={50} r={2} fill={color} opacity={0.7} />
    <Circle cx={54} cy={48} r={1.5} fill={color} opacity={0.6} />
  </Svg>
);

const CheckIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M5 12.5 L10 17.5 L19 7.5"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const ShieldIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z"
      fill={color}
      opacity={0.18}
      stroke={color}
      strokeWidth={1.5}
    />
    <Path
      d="M9 12 L11 14 L15 10"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const LockIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6 11 V8 C6 5 8.5 3 12 3 C15.5 3 18 5 18 8 V11"
      stroke={color}
      strokeWidth={1.6}
      fill="none"
      strokeLinecap="round"
    />
    <Path
      d="M5 11 H19 V21 H5 Z"
      fill={color}
      opacity={0.18}
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={16} r={1.4} fill={color} />
  </Svg>
);

const ReturnIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M4 12 H17 C19 12 20 13 20 15 V18"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M8 8 L4 12 L8 16"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const HeartIcon: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 21 C 12 21 4 14.5 4 9.5 C 4 6.5 6.5 4 9.5 4 C 11 4 12 5 12 6.5 C 12 5 13 4 14.5 4 C 17.5 4 20 6.5 20 9.5 C 20 14.5 12 21 12 21 Z"
      fill={color}
      opacity={0.2}
      stroke={color}
      strokeWidth={1.6}
    />
  </Svg>
);

interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  {
    q: 'Как происходит оплата?',
    a: 'Оплата идёт прямо в Telegram-боте через защищённый платёжный шлюз. Карта не сохраняется в приложении.',
  },
  {
    q: 'Можно ли отменить подписку?',
    a: 'Да, в один тап через личный кабинет в боте — команда /mybox → «Отменить». Доступ к Premium сохраняется до конца оплаченного месяца.',
  },
  {
    q: 'Где хранятся мои данные?',
    a: 'История цикла хранится локально в приложении. Имя, адрес и телефон — только в зашифрованной базе бота для формирования бокса (152-ФЗ). Никому не передаём.',
  },
  {
    q: 'Что если не подойдёт бокс?',
    a: 'Можно сменить тариф или отказаться от бокса в любой момент — следующий не отправим. Уже отправленный бокс возврату не подлежит, но мы заменим неподходящие позиции в следующем.',
  },
];

export const SubscriptionScreen: React.FC = () => {
  const { colors } = useApp();
  const { subscription, tier, isActive, isPremium, daysLeft } = useSubscription();
  const { deviceId, status, openBotDeepLink, refresh } = useTelegramSync();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'd MMMM yyyy', { locale: ru });
    } catch {
      return iso;
    }
  };

  const openTariff = async (slug: TariffSlug) => {
    const url =
      slug === 'box'
        ? `https://t.me/${BOT_USERNAME}?start=mybox`
        : `https://t.me/${BOT_USERNAME}?start=${slug}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Не удалось открыть Telegram', url);
    }
  };

  const openSyncDeepLink = async () => {
    if (!deviceId) {
      Alert.alert(
        'Идентификатор устройства ещё не готов',
        'Попробуй ещё раз через секунду.',
      );
      return;
    }
    try {
      await openBotDeepLink();
    } catch {
      Alert.alert('Не удалось открыть Telegram', buildBotDeepLink(deviceId));
    }
  };

  const isCurrent = (slug: TariffSlug): boolean => {
    if (!isActive) return false;
    if (slug === 'premium' && (isPremium || tier === 'premium')) return true;
    if (slug === 'basic' && tier === 'basic') return true;
    if (slug === 'vip' && tier === 'vip') return true;
    return false;
  };

  const onPressTariff = (slug: TariffSlug) => {
    if (isCurrent(slug)) {
      navigation.navigate('ManageSubscription');
      return;
    }
    void openTariff(slug);
  };

  const daysWord =
    daysLeft === 1
      ? 'день'
      : daysLeft >= 2 && daysLeft <= 4
        ? 'дня'
        : 'дней';

  const activeTierLabel =
    tier === 'vip'
      ? 'Полная симфония'
      : tier === 'basic'
        ? 'Твой ритм'
        : 'Премиум';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroSparkle}>
            <SparklesIcon size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Подписка Lira</Text>
          <Text style={styles.heroSubtitle}>
            Аналитика, бокс заботы и Лира-ассистент. Выбери, что подходит сегодня.
          </Text>
        </View>

        {/* Active banner / sync hint */}
        {isActive ? (
          <View style={styles.activeBanner}>
            <View style={styles.activeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeEyebrow}>Активная подписка</Text>
            </View>
            <Text style={styles.activeTitle}>{activeTierLabel}</Text>
            <View style={styles.activeMetaRow}>
              <View style={styles.activeMetaCol}>
                <Text style={styles.activeMetaKey}>Действует с</Text>
                <Text style={styles.activeMetaVal}>
                  {fmtDate(subscription.startedAt)}
                </Text>
              </View>
              <View style={styles.activeMetaCol}>
                <Text style={styles.activeMetaKey}>Продлевается</Text>
                <Text style={styles.activeMetaVal}>
                  {fmtDate(subscription.renewsAt)}
                </Text>
              </View>
            </View>
            <Text style={styles.activeFooter}>
              Осталось {daysLeft} {daysWord}
            </Text>
            <Pressable
              style={styles.activeManageBtn}
              onPress={() => navigation.navigate('ManageSubscription')}
            >
              <Text style={styles.activeManageText}>Управление подпиской</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.syncCard}>
            <View style={styles.syncHeaderRow}>
              <HeartIcon size={20} color={colors.primary} />
              <Text style={styles.syncTitle}>Уже оплатила в Telegram?</Text>
            </View>
            <Text style={styles.syncBody}>
              Нажми «Синхронизация», и подписка подтянется в приложение
              автоматически.
            </Text>
            <Pressable
              style={[styles.syncButton, !deviceId && { opacity: 0.6 }]}
              onPress={openSyncDeepLink}
              disabled={!deviceId}
            >
              <Text style={styles.syncButtonText}>
                {status === 'linked'
                  ? 'Привязано · обновить'
                  : 'Синхронизация с Telegram'}
              </Text>
            </Pressable>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.syncRefresh}>Проверить статус сейчас</Text>
            </Pressable>
          </View>
        )}

        {/* Tariff cards */}
        <Text style={styles.sectionTitle}>Тарифы</Text>
        {TARIFFS.map((spec) => (
          <TariffCardV2
            key={spec.slug}
            spec={spec}
            isCurrent={isCurrent(spec.slug)}
            onPress={() => onPressTariff(spec.slug)}
          />
        ))}

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <TrustItem
            icon={<ShieldIcon size={20} color={colors.primary} />}
            label="152-ФЗ"
            colors={colors}
          />
          <TrustItem
            icon={<LockIcon size={20} color={colors.primary} />}
            label="Безопасная оплата"
            colors={colors}
          />
          <TrustItem
            icon={<ReturnIcon size={20} color={colors.primary} />}
            label="Отмена в 1 тап"
            colors={colors}
          />
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Частые вопросы</Text>
        <View style={styles.faqWrap}>
          {FAQ.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Pressable
                key={item.q}
                style={[styles.faqItem, isOpen && styles.faqItemOpen]}
                onPress={() => setOpenFaq(isOpen ? null : idx)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQ}>{item.q}</Text>
                  <Text style={styles.faqChevron}>{isOpen ? '−' : '+'}</Text>
                </View>
                {isOpen ? <Text style={styles.faqA}>{item.a}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.legalText}>
          Оплата через Telegram-бота. Нажимая «Оформить», ты соглашаешься с
          условиями подписки и обработкой персональных данных по 152-ФЗ.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

interface TariffCardV2Props {
  spec: TariffSpec;
  isCurrent: boolean;
  onPress: () => void;
}

const TariffCardV2: React.FC<TariffCardV2Props> = ({
  spec,
  isCurrent,
  onPress,
}) => {
  return (
    <View
      style={[
        cardStyles.card,
        { backgroundColor: spec.bg, shadowColor: spec.bgAccent },
      ]}
    >
      <View
        style={[
          cardStyles.blob,
          { backgroundColor: spec.bgAccent, opacity: 0.55 },
        ]}
      />
      <View
        style={[
          cardStyles.blobSmall,
          { backgroundColor: spec.bgAccent, opacity: 0.35 },
        ]}
      />

      <View style={cardStyles.topRow}>
        <Text style={cardStyles.emoji}>{spec.emoji}</Text>
        {spec.badge ? (
          <View
            style={[
              cardStyles.badge,
              spec.badgeTone === 'hot'
                ? { backgroundColor: '#D26C68' }
                : spec.badgeTone === 'gold'
                  ? { backgroundColor: '#A0521C' }
                  : { backgroundColor: 'rgba(255,255,255,0.6)' },
            ]}
          >
            <Text
              style={[
                cardStyles.badgeText,
                {
                  color:
                    spec.badgeTone === 'neutral' ? spec.textColor : '#FFFFFF',
                },
              ]}
            >
              {spec.badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[cardStyles.title, { color: spec.textColor }]}>
        {spec.title}
      </Text>

      <View style={cardStyles.priceRow}>
        <Text style={[cardStyles.price, { color: spec.textColor }]}>
          {spec.price}
        </Text>
        <Text style={[cardStyles.priceSuffix, { color: spec.mutedColor }]}>
          {' '}
          {spec.priceSuffix}
        </Text>
      </View>

      <Text style={[cardStyles.tagline, { color: spec.mutedColor }]}>
        {spec.tagline}
      </Text>

      <View style={cardStyles.features}>
        {spec.features.map((line) => (
          <View key={line} style={cardStyles.featureRow}>
            <View
              style={[
                cardStyles.featureCheck,
                { backgroundColor: spec.buttonBg },
              ]}
            >
              <CheckIcon size={11} color="#FFFFFF" />
            </View>
            <Text style={[cardStyles.featureText, { color: spec.textColor }]}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        style={[
          cardStyles.cta,
          {
            backgroundColor: isCurrent
              ? 'rgba(255,255,255,0.85)'
              : spec.buttonBg,
            borderWidth: isCurrent ? 1.5 : 0,
            borderColor: spec.buttonBg,
          },
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            cardStyles.ctaText,
            { color: isCurrent ? spec.buttonBg : spec.buttonText },
          ]}
        >
          {isCurrent
            ? 'Текущий тариф · управлять'
            : spec.slug === 'box'
              ? 'Открыть «Мой бокс»'
              : `Оформить за ${spec.price} ₽`}
        </Text>
      </Pressable>
    </View>
  );
};

const TrustItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  colors: ThemeColors;
}> = ({ icon, label, colors }) => (
  <View
    style={[
      trustStyles.item,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    {icon}
    <Text style={[trustStyles.label, { color: colors.textMuted }]}>
      {label}
    </Text>
  </View>
);

const trustStyles = StyleSheet.create({
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 4,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -60,
  },
  blobSmall: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    bottom: -40,
    left: -40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    fontSize: 26,
    fontFamily: SERIF_STACK,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  price: {
    fontSize: 38,
    fontFamily: SERIF_STACK,
    fontWeight: '700',
    lineHeight: 46,
  },
  priceSuffix: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  features: {
    marginTop: 14,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    hero: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 18,
    },
    heroSparkle: {
      marginBottom: 6,
    },
    heroTitle: {
      fontSize: 38,
      lineHeight: 46,
      fontFamily: SERIF_STACK,
      color: colors.text,
      textAlign: 'center',
    },
    heroSubtitle: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    activeBanner: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.primary,
      padding: 18,
      marginBottom: 18,
      shadowColor: colors.primary,
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    activeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#22A56A',
    },
    activeEyebrow: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      color: colors.textMuted,
      fontWeight: '700',
    },
    activeTitle: {
      marginTop: 6,
      fontSize: 26,
      fontFamily: SERIF_STACK,
      color: colors.text,
    },
    activeMetaRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 12,
    },
    activeMetaCol: {
      flex: 1,
    },
    activeMetaKey: {
      fontSize: 12,
      color: colors.textMuted,
    },
    activeMetaVal: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    activeFooter: {
      marginTop: 12,
      fontSize: 13,
      color: colors.textMuted,
    },
    activeManageBtn: {
      marginTop: 14,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    activeManageText: {
      color: colors.primaryText,
      fontSize: 15,
      fontWeight: '700',
    },
    syncCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 18,
    },
    syncHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    syncTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    syncBody: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    syncButton: {
      marginTop: 12,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    syncButtonText: {
      color: colors.primaryText,
      fontSize: 14,
      fontWeight: '700',
    },
    syncRefresh: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
    },
    sectionTitle: {
      marginTop: 8,
      marginBottom: 12,
      fontSize: 20,
      fontFamily: SERIF_STACK,
      color: colors.text,
    },
    trustRow: {
      flexDirection: 'row',
      marginTop: 8,
      marginBottom: 18,
    },
    faqWrap: {
      gap: 8,
      marginBottom: 16,
    },
    faqItem: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    faqItemOpen: {
      borderColor: colors.primary,
    },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqQ: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    faqChevron: {
      marginLeft: 8,
      fontSize: 22,
      lineHeight: 22,
      color: colors.primary,
      fontWeight: '700',
    },
    faqA: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    legalText: {
      marginTop: 8,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
  });
