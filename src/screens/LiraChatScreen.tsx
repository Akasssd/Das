import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { useApp } from '../AppContext';
import { ThemeColors } from '../theme';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { syncApiBaseUrl } from '../utils/sync';
import { buildPhaseSegments, phaseForCycleDay } from '../cycle';

type ChatRole = 'user' | 'assistant';
interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
}

interface ChatBackendResponse {
  reply: string;
  disclaimer: string;
  enabled?: boolean;
}

const MAX_HISTORY = 14; // turns we keep in context
const STORAGE_KEY = '@lira/chat/v1';

const splitAuth = (raw: string): { url: string; auth: string | null } => {
  try {
    const parsed = new URL(raw);
    if (!parsed.username && !parsed.password) {
      return { url: raw.replace(/\/$/, ''), auth: null };
    }
    const user = decodeURIComponent(parsed.username);
    const pass = decodeURIComponent(parsed.password);
    parsed.username = '';
    parsed.password = '';
    const cleaned = parsed.toString().replace(/\/$/, '');
    const token =
      typeof globalThis.btoa === 'function'
        ? globalThis.btoa(`${user}:${pass}`)
        : Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
    return { url: cleaned, auth: `Basic ${token}` };
  } catch {
    return { url: raw.replace(/\/$/, ''), auth: null };
  }
};

const SparkleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v6M12 15v6M3 12h6M15 12h6"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Circle cx={12} cy={12} r={2.6} fill={color} />
  </Svg>
);

const SendIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12 21 4l-3 17-7-6-3 7-2-7 7-3Z"
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const greeting = (name?: string | null): string => {
  const who = name && name.trim().length > 0 ? `, ${name.trim()}` : '';
  return `Привет${who}! 🌿 Я Лира — твоя подружка-собеседница. Расскажи, как ты сегодня? Можем поговорить про настроение, сон, цикл, заботу о себе.`;
};

const QUICK_PROMPTS: { label: string; text: string }[] = [
  { label: 'Устала, тянет живот', text: 'Что-то устала и тянет живот, что бы поделать?' },
  { label: 'Перепады настроения', text: 'Сегодня перепады настроения, не знаю как с этим быть.' },
  { label: 'Подскажи ритуал', text: 'Подскажи мне маленький вечерний ритуал на 10 минут.' },
  { label: 'Просто поболтай', text: 'Просто хочется поболтать. Спроси меня что-нибудь.' },
];

const phaseLabel = (phase: string | null | undefined): string | undefined => {
  if (!phase) return undefined;
  switch (phase) {
    case 'period':
      return 'месячные';
    case 'follicular':
      return 'фолликулярная фаза';
    case 'fertile':
      return 'фертильное окно';
    case 'ovulation':
      return 'овуляция';
    case 'luteal':
      return 'лютеиновая фаза';
    default:
      return phase;
  }
};

const persistChat = async (msgs: ChatMessage[]): Promise<void> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-50)));
  } catch {
    /* ignore */
  }
};

const loadChat = async (): Promise<ChatMessage[]> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ChatMessage[];
  } catch {
    /* ignore */
  }
  return [];
};

const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const LiraChatScreen: React.FC = () => {
  const { colors, data, predictions } = useApp();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // Load history once.
  useEffect(() => {
    let alive = true;
    loadChat().then((stored) => {
      if (!alive) return;
      if (stored.length === 0) {
        setMessages([
          {
            id: newId(),
            role: 'assistant',
            content: greeting(data.profile.name),
            ts: Date.now(),
          },
        ]);
      } else {
        setMessages(stored);
      }
    });
    return () => {
      alive = false;
    };
    // intentionally only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Probe if backend has GigaChat configured.
  useEffect(() => {
    const { url: base, auth } = splitAuth(syncApiBaseUrl());
    const headers: Record<string, string> = {};
    if (auth) headers.Authorization = auth;
    fetch(`${base}/v1/lira/status`, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { enabled?: boolean }) => setEnabled(Boolean(j.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  // Auto-scroll on new messages.
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length, loading]);

  const cycleDay = predictions.cycleDay ?? null;
  const phaseKey = useMemo(() => {
    if (cycleDay === null) return null;
    const segments = buildPhaseSegments(
      predictions.effectiveCycleLength,
      predictions.effectivePeriodLength,
      data.settings.lutealPhaseLength,
    );
    const p = phaseForCycleDay(cycleDay, segments);
    return p === 'unknown' ? null : p;
  }, [
    cycleDay,
    predictions.effectiveCycleLength,
    predictions.effectivePeriodLength,
    data.settings.lutealPhaseLength,
  ]);
  const phase = phaseLabel(phaseKey);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || loading) return;
      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        content: trimmed,
        ts: Date.now(),
      };
      const nextMsgs = [...messages, userMsg];
      setMessages(nextMsgs);
      setDraft('');
      setLoading(true);
      setError(null);

      // Trim history to last MAX_HISTORY turns (after greeting).
      const trimmedHistory = nextMsgs.slice(-MAX_HISTORY);
      const payload = {
        messages: trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
        cycle_day: cycleDay ?? undefined,
        phase: phase ?? undefined,
      };

      try {
        const { url: base, auth } = splitAuth(syncApiBaseUrl());
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (auth) headers.Authorization = auth;
        const res = await fetch(`${base}/v1/lira/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}${body ? ` — ${body.slice(0, 120)}` : ''}`);
        }
        const json = (await res.json()) as ChatBackendResponse;
        const assistantMsg: ChatMessage = {
          id: newId(),
          role: 'assistant',
          content: json.reply,
          ts: Date.now(),
        };
        const finalMsgs = [...nextMsgs, assistantMsg];
        setMessages(finalMsgs);
        void persistChat(finalMsgs);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось получить ответ.';
        setError(msg);
        // Roll the user message back into the draft so they can retry.
        setDraft(trimmed);
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, cycleDay, phase],
  );

  const onClearChat = useCallback(async () => {
    setMessages([
      {
        id: newId(),
        role: 'assistant',
        content: greeting(data.profile.name),
        ts: Date.now(),
      },
    ]);
    setError(null);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [data.profile.name]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={StyleSheet.absoluteFill}>
        <WaveBackground colors={colors} />
      </View>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <SparkleIcon color={colors.primaryText} size={22} />
          </View>
          <View>
            <Text style={styles.title}>Лира</Text>
            <Text style={styles.subtitle}>Подружка для разговора, не врач</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.clearBtn,
            { opacity: pressed ? 0.6 : 1, borderColor: colors.border },
          ]}
          onPress={onClearChat}
          accessibilityRole="button"
        >
          <Text style={styles.clearBtnText}>Очистить</Text>
        </Pressable>
      </View>

      {enabled === false && (
        <View style={styles.disabledBanner}>
          <Text style={styles.disabledTitle}>Лира пока не подключена</Text>
          <Text style={styles.disabledBody}>
            Чат-ассистент использует GigaChat. Бэкенд этой сборки ещё не получил
            ключ — попроси администратора добавить GIGACHAT_CLIENT_ID/SECRET и
            перезапустить API.
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubbleRow,
                m.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={
                    m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant
                  }
                >
                  {m.content}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleTyping]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.bubbleTextAssistant, { marginLeft: 8 }]}>
                  Лира пишет…
                </Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Не удалось ответить</Text>
              <Text style={styles.errorBody}>{error}</Text>
            </View>
          )}

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerText}>
              ℹ️ Лира — дружеская поддержка, не врач. При тревожных симптомах
              (сильная боль, кровотечение, температура) — обратись к специалисту
              или 103/112.
            </Text>
          </View>

          {messages.length <= 2 && (
            <View style={styles.quickRow}>
              {QUICK_PROMPTS.map((q) => (
                <Pressable
                  key={q.label}
                  style={({ pressed }) => [
                    styles.quickChip,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => void sendMessage(q.text)}
                >
                  <Text style={styles.quickChipText}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Расскажи Лире, как дела…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={1500}
            editable={!loading && enabled !== false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: colors.primary,
                opacity:
                  pressed || draft.trim().length === 0 || loading || enabled === false
                    ? 0.55
                    : 1,
              },
            ]}
            onPress={() => void sendMessage(draft)}
            disabled={draft.trim().length === 0 || loading || enabled === false}
            accessibilityRole="button"
            accessibilityLabel="Отправить"
          >
            <SendIcon color={colors.primaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const buildStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    kav: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    title: {
      fontSize: 22,
      color: colors.text,
      fontFamily: SERIF_STACK,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
    clearBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: colors.card,
    },
    clearBtnText: {
      color: colors.textMuted,
      fontSize: 12,
      letterSpacing: 0.4,
    },
    disabledBanner: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    disabledTitle: {
      color: colors.text,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    disabledBody: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    bubbleRow: {
      width: '100%',
      flexDirection: 'row',
      marginBottom: 8,
    },
    bubbleRowLeft: {
      justifyContent: 'flex-start',
    },
    bubbleRowRight: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '82%',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 18,
    },
    bubbleAssistant: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderTopRightRadius: 6,
    },
    bubbleTyping: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bubbleTextUser: {
      color: colors.primaryText,
      fontSize: 15,
      lineHeight: 21,
    },
    bubbleTextAssistant: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
    },
    errorCard: {
      backgroundColor: '#FCE7DC',
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E8B58A',
    },
    errorTitle: {
      color: '#7A4A3A',
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    errorBody: {
      color: '#7A4A3A',
      fontSize: 12,
    },
    disclaimerCard: {
      marginTop: 4,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    disclaimerText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    quickRow: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 18,
    },
    quickChipText: {
      color: colors.text,
      fontSize: 13,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
