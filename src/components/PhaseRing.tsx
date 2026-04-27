import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { CyclePhase, PhaseSegment } from '../cycle';
import { ThemeColors } from '../theme';

interface Props {
  size: number;
  cycleLen: number;
  cycleDay: number | null;
  segments: PhaseSegment[];
  colors: ThemeColors;
  children?: React.ReactNode;
}

const phaseColor = (phase: CyclePhase, colors: ThemeColors): string => {
  switch (phase) {
    case 'period':
      return colors.period;
    case 'follicular':
      return colors.follicular;
    case 'fertile':
      return colors.fertile;
    case 'ovulation':
      return colors.ovulation;
    case 'luteal':
      return colors.luteal;
    default:
      return colors.ringTrack;
  }
};

export const PhaseRing: React.FC<Props> = ({
  size,
  cycleLen,
  cycleDay,
  segments,
  colors,
  children,
}) => {
  const stroke = Math.max(8, size * 0.045);
  const radius = (size - stroke) / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const arcFor = (startDay: number, endDay: number) => {
    const startFrac = (startDay - 1) / cycleLen;
    const endFrac = endDay / cycleLen;
    const length = (endFrac - startFrac) * circumference;
    const offset = startFrac * circumference;
    return {
      strokeDasharray: `${length} ${circumference - length}`,
      strokeDashoffset: -offset,
    };
  };

  const dotPos = (() => {
    if (cycleDay === null) return null;
    const frac = (cycleDay - 0.5) / cycleLen;
    const angle = frac * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  })();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${size} ${size}`}
      >
        <G transform={`rotate(-90 ${cx} ${cy})`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.ringTrack}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
          />
          {segments.map((seg, idx) => {
            const arc = arcFor(seg.startDay, seg.endDay);
            return (
              <Circle
                key={`${seg.phase}-${idx}-${seg.startDay}`}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={phaseColor(seg.phase, colors)}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="butt"
                strokeDasharray={arc.strokeDasharray}
                strokeDashoffset={arc.strokeDashoffset}
              />
            );
          })}
        </G>
        {dotPos && (
          <>
            <Circle
              cx={dotPos.x}
              cy={dotPos.y}
              r={stroke * 0.78}
              fill={colors.card}
            />
            <Circle
              cx={dotPos.x}
              cy={dotPos.y}
              r={stroke * 0.42}
              fill={colors.primary}
            />
          </>
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
