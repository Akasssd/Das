import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { format } from 'date-fns';

import { useApp } from '../AppContext';
import { ThemeColors } from '../theme';

type Level = 'light' | 'medium' | 'heavy';

interface DropProps {
  size: number;
  fill: string;
  stroke: string;
  filled: number; // 0..1, how much of the drop is "filled in"
}

const Drop: React.FC<DropProps> = ({ size, fill, stroke, filled }) => {
  // The drop body is a teardrop. We render two layers: a faint outline drop,
  // then a clipped solid drop showing the filled portion (so 1 drop = 1/3
  // filled, 2 drops = 2/3, 3 drops = full).
  const fillHeight = 80 * filled;
  const fillY = 80 - fillHeight;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 80">
      <Path
        d="M32 4 C 32 4 8 30 8 50 C 8 64 19 76 32 76 C 45 76 56 64 56 50 C 56 30 32 4 32 4 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        opacity={filled === 0 ? 0.18 : 1}
      />
      {filled > 0 && filled < 1 ? (
        // Layered approach not strictly needed since we already use opacity;
        // but the wave on the surface reads nicer.
        <Path
          d={`M8 ${fillY} L 56 ${fillY}`}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.25}
        />
      ) : null}
    </Svg>
  );
};

interface Props {
  /** Highlight + pulse — we are within ±3 days of the predicted period. */
  highlight: boolean;
  colors: ThemeColors;
}

const LEVEL_TO_FILL: Record<Level, number> = {
  light: 0.34,
  medium: 0.66,
  heavy: 1,
};

export const FlowQuickLog: React.FC<Props> = ({ highlight, colors }) => {
  const { data, upsertLogs } = useApp();
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayLog = data.logs[todayKey];
  const currentFlow = todayLog?.flow;
  const isCleared = !currentFlow || currentFlow === 'none';

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlight) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, pulse]);

  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const tapLevel = async (level: Level) => {
    // Toggle: tapping the same level again clears today's flow.
    const next = currentFlow === level ? 'none' : level;
    await upsertLogs([
      {
        ...(todayLog ?? { date: todayKey }),
        date: todayKey,
        flow: next as 'none' | 'light' | 'medium' | 'heavy',
      },
    ]);
  };

  const styles = makeStyles(colors);
  const accent = colors.primary;
  const inactive = colors.fertile;

  const dropFor = (level: Level) => {
    const isSelected = currentFlow === level;
    const filled = isCleared
      ? 0
      : isSelected
        ? LEVEL_TO_FILL[level]
        : LEVEL_TO_FILL[level] * 0.35;
    return (
      <Pressable
        key={level}
        onPress={() => tapLevel(level)}
        style={[
          styles.drop,
          isSelected && {
            backgroundColor: colors.fertile,
            borderColor: accent,
          },
        ]}
      >
        <Drop
          size={36}
          fill={isSelected ? accent : inactive}
          stroke={accent}
          filled={filled}
        />
        <Text
          style={[
            styles.dropLabel,
            isSelected && { color: colors.text, fontWeight: '700' },
          ]}
        >
          {level === 'light' ? 'Лёгкие' : level === 'medium' ? 'Средние' : 'Обильные'}
        </Text>
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.box, highlight && { borderColor }]}>
      <Text style={styles.title}>Месячные начались?</Text>
      <View style={styles.row}>
        {dropFor('light')}
        {dropFor('medium')}
        {dropFor('heavy')}
      </View>
      {!isCleared ? (
        <Text style={styles.hint}>
          Записано на сегодня. Нажми ту же каплю, чтобы убрать.
        </Text>
      ) : (
        <Text style={styles.hint}>Тапни каплю, чтобы отметить начало месячных.</Text>
      )}
    </Animated.View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    box: {
      width: '100%',
      marginTop: 16,
      marginBottom: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    title: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      letterSpacing: 0.4,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    drop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'transparent',
      marginHorizontal: 4,
    },
    dropLabel: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.3,
    },
    hint: {
      marginTop: 10,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
