import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../AppContext';
import { useSubscription } from '../hooks/useSubscription';
import { RootStackParamList } from '../navigation';
import { ThemeColors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  /** Title shown over the locked feature. */
  feature: string;
  /** Optional descriptor of what unlocks. */
  body?: string;
}

export const PremiumGate: React.FC<Props> = ({ feature, body }) => {
  const { colors } = useApp();
  const { isPremium } = useSubscription();
  const navigation = useNavigation<Nav>();
  const styles = makeStyles(colors);
  if (isPremium) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Доступно с Lira Premium</Text>
      <Text style={styles.title}>{feature}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      <Pressable
        style={styles.cta}
        onPress={() => navigation.navigate('Subscription')}
      >
        <Text style={styles.ctaText}>Узнать про Premium</Text>
      </Pressable>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 18,
      marginVertical: 12,
    },
    label: {
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.primary,
      marginBottom: 6,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    body: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      marginBottom: 12,
    },
    cta: {
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    ctaText: {
      color: colors.primaryText,
      fontWeight: '700',
      fontSize: 13,
      letterSpacing: 0.4,
    },
  });
