import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemeColors } from '../theme';

export const WaveBackground: React.FC<{ colors: ThemeColors }> = ({
  colors,
}) => (
  <Svg
    style={StyleSheet.absoluteFill}
    width="100%"
    height="100%"
    viewBox="0 0 400 800"
    preserveAspectRatio="xMidYMid slice"
  >
    <Path
      d="M0 120 Q 100 60 220 120 T 400 140 L 400 0 L 0 0 Z"
      fill={colors.backgroundAccent}
      opacity={0.45}
    />
    <Path
      d="M0 220 Q 120 160 240 220 T 400 240"
      fill="none"
      stroke={colors.backgroundAccent}
      strokeWidth={1.5}
      opacity={0.5}
    />
    <Path
      d="M0 720 Q 100 660 220 720 T 400 720 L 400 800 L 0 800 Z"
      fill={colors.backgroundAccent}
      opacity={0.45}
    />
    <Path
      d="M-20 540 Q 80 480 200 540 T 420 540"
      fill="none"
      stroke={colors.backgroundAccent}
      strokeWidth={1.5}
      opacity={0.5}
    />
    <Path
      d="M-20 600 Q 100 560 220 600 T 420 580"
      fill="none"
      stroke={colors.backgroundAccent}
      strokeWidth={1}
      opacity={0.4}
    />
  </Svg>
);

export const SERIF_STACK =
  'Cochin, "Hoefler Text", "Times New Roman", Georgia, serif';
