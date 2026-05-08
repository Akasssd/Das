import React, { useMemo } from 'react';
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

import { useApp } from '../AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { useTelegramSync } from '../hooks/useTelegramSync';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import { buildBotDeepLink } from '../utils/sync';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const BOT_USERNAME = 'lowerBsk24_bot';
const BUTTON_ACCENT = '#8267E6';

interface TariffCardProps {
  title: string;
  price: string;
  body: string;
  buttonLabel: string;
  tint: string;
  glow: string;
  active?: boolean;
  onPress: () => void;
}

const TariffCard: React.FC<TariffCardProps> = ({
  title,
  price,
  body,
  buttonLabel,
  tint,
  glow,
  active,
  onPress,
}) => {
  return (
    <View
      style={[
        stylesShared.card,
        {
          backgroundColor: tint,
          shadowColor: glow,
          borderColor: active ? BUTTON_ACCENT : 'rgba(255,255,255,0.35)',
          borderWidth: active ? 1.5 : 1,
        },
      ]}
    >
      <View style={stylesShared.cardTopRow}>
        <Text style={stylesShared.cardTitle}>{title}</Text>
        <Text style={stylesShared.cardPrice}>{price}</Text>
      </View>
      <Text style={stylesShared.cardBody}>{body}</Text>
      <Pressable style={stylesShared.cardButton} onPress={onPress}>
        <Text style={stylesShared.cardButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
};

interface PremiumCardProps {
  active?: boolean;
  onPress: () => void;
  colors: ThemeColors;
}

const PremiumCard: React.FC<PremiumCardProps> = ({ active, onPress, colors }) => {
  return (
    <View
      style={[
        stylesShared.card,
        {
          backgroundColor: colors.surface,
          borderColor: active ? colors.primary : colors.border,
          borderWidth: active ? 1.5 : 1,
          shadowColor: colors.primary,
          overflow: 'hidden',
        },
      ]}
    >
      <View
        style={[
          stylesShared.premiumGlowA,
          { backgroundColor: colors.fertile, opacity: 0.7 },
        ]}
      />
      <View
        style={[
          stylesShared.premiumGlowB,
          { backgroundColor: colors.ovulation, opacity: 0.55 },
        ]}
      />
      <View style={stylesShared.premiumBadgeRow}>
        <View
          style={[
            stylesShared.premiumBadge,
            { backgroundColor: colors.background },
          ]}
        >
          <Text
            style={[stylesShared.premiumBadgeText, { color: colors.primary }]}
          >
            NEW · 199 ₽/мес · без опросника
          </Text>
        </View>
      </View>
      <View style={stylesShared.cardTopRow}>
        <Text style={[stylesShared.cardTitle, { color: colors.text }]}>
          Lira Premium
        </Text>
        <Text style={[stylesShared.cardPrice, { color: colors.text }]}>
          199 ₽/мес
        </Text>
      </View>
      <Text style={[stylesShared.cardBody, { color: colors.text }]}>
        Расширенная аналитика цикла, прогноз овуляции, экспорт данных,
        персональные гайды. Без опросника — оплата прямо в Telegram-боте.
      </Text>
      <View style={stylesShared.featureList}>
        {[
          'Графики температуры и симптомов',
          'Детальный прогноз овуляции',
          'Экспорт циклов в PDF / CSV',
          'Персональные гайды и статьи',
        ].map((line) => (
          <Text
            key={line}
            style={[stylesShared.featureLine, { color: colors.text }]}
          >
            ✦ {line}
          </Text>
        ))}
      </View>
      <Pressable
        style={[
          stylesShared.cardButton,
          { backgroundColor: colors.primary },
        ]}
        onPress={onPress}
      >
        <Text style={[stylesShared.cardButtonText, { color: colors.primaryText }]}>
          {active ? 'Управление подпиской' : 'Оформить за 199 ₽/мес в Telegram'}
        </Text>
      </Pressable>
    </View>
  );
};

export const SubscriptionScreen: React.FC = () => {
  const { colors } = useApp();
  const { subscription, tier, isActive, isPremium, daysLeft } = useSubscription();
  const { deviceId, status, openBotDeepLink, refresh } = useTelegramSync();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'd MMMM yyyy', { locale: ru });
    } catch {
      return iso;
    }
  };

  const openTariff = async (slug: 'premium' | 'basic' | 'vip' | 'box') => {
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

  const onPressPremium = () => {
    if (isActive) {
      navigation.navigate('ManageSubscription');
    } else {
      void openTariff('premium');
    }
  };

  const daysWord =
    daysLeft === 1
      ? 'день'
      : daysLeft >= 2 && daysLeft <= 4
        ? 'дня'
        : 'дней';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Подписка</Text>
        <Text style={styles.subtitle}>
          Оплата проходит прямо в Telegram-боте Lira. После оплаты нажми
          «Синхронизация с Telegram» — подписка и даты цикла подтянутся
          автоматически.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusEyebrow}>
            {isActive ? 'Активная подписка' : 'Подписка не активирована'}
          </Text>
          <Text style={styles.statusTitle}>
            {isActive
              ? tier === 'vip'
                ? 'Полная симфония'
                : tier === 'basic'
                  ? 'Твой ритм'
                  : 'Lira Premium'
              : 'Подключи в Telegram'}
          </Text>
          {isActive ? (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusKey}>Действует с</Text>
                <Text style={styles.statusVal}>
                  {fmtDate(subscription.startedAt)}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusKey}>Продлевается</Text>
                <Text style={styles.statusVal}>
                  {fmtDate(subscription.renewsAt)}
                </Text>
              </View>
              <Text style={styles.statusHint}>
                Осталось {daysLeft} {daysWord}.
              </Text>
              <Pressable
                style={styles.manageButton}
                onPress={() => navigation.navigate('ManageSubscription')}
              >
                <Text style={styles.manageButtonText}>Управление подпиской</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.statusHint}>
              Выбери тариф в Telegram-боте — после оплаты вернись сюда и нажми
              «Синхронизация с Telegram».
            </Text>
          )}
        </View>

        <View style={styles.syncCard}>
          <Text style={styles.syncTitle}>Синхронизация с Telegram</Text>
          <Text style={styles.syncBody}>
            Привяжет приложение к твоему Telegram-аккаунту, чтобы оплаченная
            подписка и даты цикла подгрузились автоматически. Связь
            односторонняя — приложение только читает данные из бота.
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
          {deviceId ? (
            <Text style={styles.syncMeta}>
              {status === 'linked'
                ? 'Готово. При следующем заходе подписка обновится сама.'
                : status === 'awaiting-bind'
                  ? 'Жду подтверждения в Telegram…'
                  : status === 'error'
                    ? 'Не получилось связаться с сервером — попробую ещё раз.'
                    : 'Идентификатор устройства готов.'}
            </Text>
          ) : null}
          <Pressable onPress={() => void refresh()}>
            <Text style={styles.syncRefresh}>Проверить статус сейчас</Text>
          </Pressable>
        </View>

        <PremiumCard active={isPremium} onPress={onPressPremium} colors={colors} />

        <TariffCard
          title="Твой ритм"
          price="999 ₽/мес"
          body={
            'Цифровая подписка + ежемесячный бокс заботы: гигиена, шоколад, '
            + 'средство ухода. Подбор под твой профиль. Опрос — в боте.'
          }
          buttonLabel="Оформить в Telegram"
          tint="#FBE0CC"
          glow="#F2A663"
          active={isActive && tier === 'basic'}
          onPress={() => void openTariff('basic')}
        />

        <TariffCard
          title="Полная симфония"
          price="1999 ₽/мес"
          body={
            'Расширенный бокс: до 8 предметов + сюрприз — органика, '
            + 'шоколад ручной работы, 3 средства ухода, чай, гайды.'
          }
          buttonLabel="Оформить в Telegram"
          tint="#E9DCFB"
          glow="#7B5DD6"
          active={isActive && tier === 'vip'}
          onPress={() => void openTariff('vip')}
        />

        <TariffCard
          title="Мой бокс"
          price="статус"
          body={
            'Действующая подписка с боксом — посмотреть статус доставки, '
            + 'дату ближайшего бокса и адрес.'
          }
          buttonLabel="Открыть «Мой бокс»"
          tint="#FCE8DC"
          glow="#E8B58A"
          onPress={() => void openTariff('box')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const stylesShared = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: SERIF_STACK,
    color: '#3A2A1F',
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2A1F',
  },
  cardBody: {
    marginTop: 8,
    color: '#3A2A1F',
    fontSize: 14,
    lineHeight: 20,
  },
  cardButton: {
    marginTop: 14,
    backgroundColor: BUTTON_ACCENT,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  premiumGlowA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -40,
  },
  premiumGlowB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -30,
    left: -30,
  },
  premiumBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  featureList: {
    marginTop: 12,
    gap: 4,
  },
  featureLine: {
    fontSize: 13,
    lineHeight: 19,
  },
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    title: {
      fontSize: 36,
      lineHeight: 44,
      fontFamily: SERIF_STACK,
      color: colors.text,
      marginTop: 8,
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 20,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
    },
    statusCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 18,
    },
    statusEyebrow: {
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      color: colors.textMuted,
    },
    statusTitle: {
      marginTop: 6,
      fontSize: 24,
      fontFamily: SERIF_STACK,
      color: colors.text,
    },
    statusRow: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    statusKey: {
      fontSize: 14,
      color: colors.textMuted,
    },
    statusVal: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    statusHint: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textMuted,
    },
    manageButton: {
      marginTop: 14,
      backgroundColor: BUTTON_ACCENT,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    manageButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    syncCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      marginBottom: 18,
    },
    syncTitle: {
      fontSize: 20,
      fontFamily: SERIF_STACK,
      color: colors.text,
    },
    syncBody: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    syncButton: {
      marginTop: 14,
      backgroundColor: BUTTON_ACCENT,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    syncButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    syncMeta: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    syncRefresh: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: '600',
      color: BUTTON_ACCENT,
      textAlign: 'center',
    },
  });
