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

import { ThemeColors } from '../theme';

interface Props {
  /** Light up + pulse the button (we are within ±3 days of the prediction). */
  highlight: boolean;
  onPress: () => void;
  colors: ThemeColors;
}

const Drop: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 64 80">
    <Path
      d="M32 4 C 32 4 8 30 8 50 C 8 64 19 76 32 76 C 45 76 56 64 56 50 C 56 30 32 4 32 4 Z"
      fill={color}
    />
  </Svg>
);

export const PeriodArrivedButton: React.FC<Props> = ({
  highlight,
  onPress,
  colors,
}) => {
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
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  const bg = highlight ? colors.primary : colors.card;
  const fg = highlight ? '#FFFFFF' : colors.text;
  const dropColor = highlight ? '#FFFFFF' : colors.fertile;

  return (
    <View style={styles.wrap}>
      {highlight && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { backgroundColor: colors.primary, opacity: glow },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          style={[
            styles.button,
            {
              backgroundColor: bg,
              borderColor: highlight ? colors.primary : colors.border,
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <Drop size={28} color={dropColor} />
          </View>
          <Text style={[styles.label, { color: fg }]}>Месячные пришли</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 200,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 240,
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
