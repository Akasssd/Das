import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { addDays, format, parseISO } from 'date-fns';

import { useApp } from '../AppContext';
import { ThemeColors } from '../theme';
import { useCycleCorrection, formatChipLabel } from '../hooks/useCycleCorrection';

interface Props {
  /** True when within ±3 days of the predicted period — pulse + brighten. */
  highlight: boolean;
  colors: ThemeColors;
}

interface DropProps {
  size: number;
  fill: string;
  outline: string;
  /** 0..1 — fraction of the drop that's filled. */
  fillRatio: number;
}

const DROP_VB_W = 64;
const DROP_VB_H = 80;

const Drop: React.FC<DropProps> = ({ size, fill, outline, fillRatio }) => {
  const ratio = Math.max(0, Math.min(1, fillRatio));
  const fillHeight = DROP_VB_H * ratio;
  const fillY = DROP_VB_H - fillHeight;
  return (
    <Svg width={size} height={size * (DROP_VB_H / DROP_VB_W)} viewBox={`0 0 ${DROP_VB_W} ${DROP_VB_H}`}>
      <Defs>
        <ClipPath id="dropClip">
          <Path d="M32 4 C 32 4 8 30 8 50 C 8 64 19 76 32 76 C 45 76 56 64 56 50 C 56 30 32 4 32 4 Z" />
        </ClipPath>
      </Defs>
      <Path
        d="M32 4 C 32 4 8 30 8 50 C 8 64 19 76 32 76 C 45 76 56 64 56 50 C 56 30 32 4 32 4 Z"
        fill={ratio === 0 ? 'transparent' : 'transparent'}
        stroke={outline}
        strokeWidth={3}
      />
      {ratio > 0 ? (
        <Rect
          x={0}
          y={fillY}
          width={DROP_VB_W}
          height={fillHeight}
          fill={fill}
          clipPath="url(#dropClip)"
        />
      ) : null}
    </Svg>
  );
};

/**
 * Tap-to-confirm period button:
 *   - empty → 1/3 → 2/3 → full (= "месячные начались" logged for today)
 *   - one more tap on full → unlogged + reset to empty
 *
 * "Trial" taps (1/3, 2/3) are kept only in component state; nothing is written
 * until the third tap. If the user taps fewer than 3 times and leaves, the
 * widget shows "full" automatically the next render only if today's log
 * already has a period flow.
 */
export const PeriodStartedButton: React.FC<Props> = ({ highlight, colors }) => {
  const { data, upsertLogs } = useApp();
  const { markPeriodStart } = useCycleCorrection();
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayLog = data.logs[todayKey];
  const isLoggedToday = !!(todayLog?.flow && todayLog.flow !== 'none');

  // Local taps progress: 0..3. Resets when log changes externally.
  const [taps, setTaps] = useState<number>(isLoggedToday ? 3 : 0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setTaps(isLoggedToday ? 3 : 0);
  }, [isLoggedToday]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!highlight || isLoggedToday) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, isLoggedToday, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const onPress = async () => {
    if (taps >= 3) {
      // Already logged → unlog and reset.
      await upsertLogs([
        {
          ...(todayLog ?? { date: todayKey }),
          date: todayKey,
          flow: 'none',
        },
      ]);
      setTaps(0);
      return;
    }
    const next = taps + 1;
    setTaps(next);
    if (next === 3) {
      // Commit: mark period started today (default to medium flow).
      await upsertLogs([
        {
          ...(todayLog ?? { date: todayKey }),
          date: todayKey,
          flow: 'medium',
        },
      ]);
    }
  };

  const ratio = taps / 3;
  const subtitle = isLoggedToday
    ? 'Месячные сегодня отмечены — тапни ещё, чтобы снять'
    : taps === 0
      ? 'Тапни каплю 3 раза, чтобы отметить начало'
      : `Ещё ${3 - taps} ${3 - taps === 1 ? 'тап' : 'тапа'}`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textMuted }]}>Месячные начались?</Text>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Месячные начались"
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.card, borderColor: colors.border },
            isLoggedToday && {
              borderColor: colors.primary,
              backgroundColor: colors.surface,
            },
            highlight && !isLoggedToday && { borderColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Drop
            size={56}
            fill={isLoggedToday || highlight ? colors.primary : colors.period}
            outline={isLoggedToday || highlight ? colors.primary : colors.period}
            fillRatio={ratio}
          />
        </Pressable>
      </Animated.View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{subtitle}</Text>

      <Pressable onPress={() => setPickerOpen((o) => !o)} hitSlop={8}>
        <Text style={[styles.adjustLink, { color: colors.primary }]}>
          {pickerOpen ? 'Свернуть' : 'Месячные начались в другой день?'}
        </Text>
      </Pressable>

      {pickerOpen ? (
        <View style={styles.pickerWrap}>
          <Text style={[styles.pickerHint, { color: colors.textMuted }]}>
            Выбери день, когда фактически начались месячные. Все прогнозы — текущий цикл и будущие — пересчитаются.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {Array.from({ length: 15 }, (_, i) => i - 7).map((offset) => {
              const date = addDays(new Date(), offset);
              const iso = format(date, 'yyyy-MM-dd');
              const isToday = offset === 0;
              const isFuture = offset > 0;
              const log = data.logs[iso];
              const isMarked =
                log?.flow !== undefined && log.flow !== 'none';
              const isSelected = isMarked;
              return (
                <Pressable
                  key={iso}
                  onPress={async () => {
                    await markPeriodStart(iso);
                    setPickerOpen(false);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.card,
                      borderColor: isToday
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected
                          ? colors.primaryText
                          : isFuture
                            ? colors.textMuted
                            : colors.text,
                        fontWeight: isToday ? '700' : '500',
                      },
                    ]}
                  >
                    {isToday ? 'Сегодня' : formatChipLabel(iso)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

void parseISO;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  btn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    marginTop: 12,
    letterSpacing: 0.2,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  adjustLink: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  pickerWrap: {
    width: '100%',
    marginTop: 12,
  },
  pickerHint: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  chipsRow: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
