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
import { ru } from 'date-fns/locale';

import { useApp } from '../AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TELEGRAM_BOT_URL = 'https://t.me/lowerBsk24_bot?start=subscription';
const BUTTON_ACCENT = '#8267E6';

interface MysteryTierCardProps {
  title: string;
  price: string;
  body: string;
  buttonLabel: string;
  tint: string;
  glow: string;
  active?: boolean;
  onPress: () => void;
}

const MysteryTierCard: React.FC<MysteryTierCardProps> = ({
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

export const SubscriptionScreen: React.FC = () => {
  const { colors } = useApp();
  const { subscription, tier, isActive, daysLeft, activate } = useSubscription();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return format(parseISO(iso), 'd MMMM yyyy', { locale: ru });
    } catch {
      return iso;
    }
  };

  const openBot = () => {
    Linking.openURL(TELEGRAM_BOT_URL).catch(() => {
      Alert.alert('Не получилось открыть Telegram', TELEGRAM_BOT_URL);
    });
  };

  const onActivate = async () => {
    setSubmitting(true);
    try {
      const res = await activate(code);
      if (res.ok) {
        setCode('');
        Alert.alert(
          'Подписка активирована',
          `Тариф: ${res.tier === 'vip' ? 'Полная симфония' : 'Твой ритм'}. Действует до ${fmtDate(`${res.expires}T00:00:00.000Z`)}.`,
        );
        return;
      }
      if (res.reason === 'empty') {
        Alert.alert('Введи код', 'Скопируй код из сообщения бота и вставь сюда.');
        return;
      }
      Alert.alert(
        'Код не найден',
        'Проверь, что ввела код полностью и без пробелов. Если код правильный — напиши боту.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Твоя тайная коробка заботы</Text>
        <Text style={styles.subtitle}>Мы узнали тебя. Теперь доверься нам.</Text>

        {isActive ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusEyebrow}>Подписка активна</Text>
            <Text style={styles.statusTitle}>
              {tier === 'vip' ? 'Полная симфония' : 'Твой ритм'}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusKey}>Действует до</Text>
              <Text style={styles.statusVal}>{fmtDate(subscription.renewsAt)}</Text>
            </View>
            <Text style={styles.statusHint}>Осталось дней: {daysLeft}</Text>
            <Pressable
              style={styles.manageButton}
              onPress={() => navigation.navigate('ManageSubscription')}
            >
              <Text style={styles.manageButtonText}>Управление</Text>
            </Pressable>
          </View>
        ) : null}

        <MysteryTierCard
          title="Твой ритм"
          price="999₽/мес"
          tint={colors.card}
          glow="#D8BDEB"
          active={isActive && tier === 'basic'}
          body="Каждый месяц перед началом цикла курьер приносит загадочную коробку. Внутри – твои выбранные средства гигиены, вкусный комплимент и ритуал ухода. Состав меняется, опираясь на твой профиль, аллергии, сезон и фазу. Мы не повторяемся. Ты узнаешь наполнение, только открыв коробку."
          buttonLabel="Выбрать ритм"
          onPress={openBot}
        />

        <MysteryTierCard
          title="Полная симфония"
          price="1999₽/мес"
          tint={colors.surface}
          glow="#C9B5FF"
          active={isActive && tier === 'vip'}
          body="Расширенная тайна для тех, кто хочет больше заботы и сюрпризов. Органические средства гигиены, гастрономический подарок ручной работы, ритуалы ухода для лица, тела и души, чайная церемония и тайный презент. Плюс персональные гайды и медитации в приложении. Бесплатная доставка к началу цикла. Мы собираем этот бокс в абсолютной тишине, зная о тебе больше, чем ты думаешь. Открой – и почувствуй мелодию заботы, написанную только для тебя."
          buttonLabel="Выбрать симфонию"
          onPress={openBot}
        />

        <View style={styles.codeCard}>
          <Text style={styles.codeTitle}>Код активации</Text>
          <Text style={styles.codeHint}>
            Бот пришлёт его после оплаты. Введи код, чтобы активировать подписку в приложении.
          </Text>
          <TextInput
            style={styles.codeInput}
            placeholder="Например, A7K9TXM2"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            editable={!submitting}
          />
          <Pressable
            style={[styles.activateButton, submitting && { opacity: 0.6 }]}
            onPress={onActivate}
            disabled={submitting}
          >
            <Text style={styles.activateButtonText}>Активировать</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const stylesShared = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: SERIF_STACK,
    color: '#7E6177',
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7E6177',
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#8F786C',
  },
  cardButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: BUTTON_ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
      marginBottom: 24,
      fontSize: 17,
      lineHeight: 24,
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
    codeCard: {
      marginTop: 6,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    codeTitle: {
      fontSize: 22,
      fontFamily: SERIF_STACK,
      color: colors.text,
    },
    codeHint: {
      marginTop: 8,
      marginBottom: 12,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textMuted,
    },
    codeInput: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      letterSpacing: 2,
      color: colors.text,
    },
    activateButton: {
      marginTop: 12,
      backgroundColor: BUTTON_ACCENT,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
    activateButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
