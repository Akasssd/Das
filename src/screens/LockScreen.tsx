import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { ThemeColors } from '../theme';
import { checkPin } from '../pin';

const SERIF =
  'Cochin, "Hoefler Text", "Times New Roman", Georgia, serif';

interface Props {
  onUnlock: () => void;
}

export const LockScreen: React.FC<Props> = ({ onUnlock }) => {
  const { colors, t, data } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!data.profile.pinHash) return;
    if (entered.length >= 4 && entered.length <= 6) {
      // Try unlock on each enter that has a sensible length only when user
      // taps OK (handled below). Avoid auto-attempt to allow longer PINs.
    }
  }, [entered, data.profile.pinHash]);

  const press = (digit: string) => {
    setError(false);
    if (entered.length >= 6) return;
    setEntered((s) => s + digit);
  };
  const back = () => {
    setError(false);
    setEntered((s) => s.slice(0, -1));
  };
  const submit = () => {
    if (!data.profile.pinHash) {
      onUnlock();
      return;
    }
    if (checkPin(entered, data.profile.pinHash)) {
      onUnlock();
    } else {
      setError(true);
      setEntered('');
    }
  };

  const dots = Array.from({ length: 6 }, (_, i) => (
    <View
      key={i}
      style={[
        styles.dot,
        i < entered.length && {
          backgroundColor: error ? colors.danger : colors.primary,
          borderColor: error ? colors.danger : colors.primary,
        },
      ]}
    />
  ));

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text style={styles.title}>
          {t('lock.greeting', { name: data.profile.name || '' }).trim()}
        </Text>
        <Text style={styles.subtitle}>{t('lock.enterPin')}</Text>
        <View style={styles.dotsRow}>{dots}</View>
        {error ? (
          <Text style={styles.errorText}>{t('lock.wrongPin')}</Text>
        ) : (
          <Text style={styles.errorPlaceholder}> </Text>
        )}
      </View>

      <View style={styles.pad}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((k, ki) => {
              if (k === '') return <View key={ki} style={styles.key} />;
              if (k === '⌫') {
                return (
                  <Pressable key={ki} style={styles.key} onPress={back}>
                    <Text style={styles.keyText}>⌫</Text>
                  </Pressable>
                );
              }
              return (
                <Pressable key={ki} style={styles.key} onPress={() => press(k)}>
                  <Text style={styles.keyText}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Pressable
          style={[
            styles.submitBtn,
            entered.length < 4 && { opacity: 0.4 },
          ]}
          onPress={submit}
          disabled={entered.length < 4}
        >
          <Text style={styles.submitBtnText}>{t('lock.unlock')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    top: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 32,
      fontFamily: SERIF,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 12,
      fontSize: 14,
      color: colors.textMuted,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 32,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    errorText: {
      marginTop: 16,
      color: colors.danger,
      fontSize: 14,
    },
    errorPlaceholder: { marginTop: 16, fontSize: 14, opacity: 0 },
    pad: { padding: 24 },
    padRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    key: {
      width: '30%',
      aspectRatio: 1.6,
      maxHeight: 64,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyText: { fontSize: 24, color: colors.text, fontWeight: '500' },
    submitBtn: {
      marginTop: 8,
      paddingVertical: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    submitBtnText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  });
