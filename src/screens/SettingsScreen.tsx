import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../AppContext';
import { RootStackParamList } from '../navigation';
import { Settings } from '../types';
import { exportData } from '../storage';
import { hashPin } from '../pin';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const APP_VERSION = '0.1.0';

export const SettingsScreen: React.FC = () => {
  const { data, updateSettings, updateProfile, resetAll, colors, t } = useApp();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [cycleLen, setCycleLen] = useState(String(data.settings.averageCycleLength));
  const [periodLen, setPeriodLen] = useState(
    String(data.settings.averagePeriodLength),
  );
  const [lutealLen, setLutealLen] = useState(
    String(data.settings.lutealPhaseLength),
  );
  const [name, setName] = useState(data.profile.name);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');

  const commitNumber = (
    text: string,
    key: keyof Settings,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const n = Number.parseInt(text, 10);
    const clamped =
      Number.isFinite(n) && !Number.isNaN(n)
        ? Math.min(max, Math.max(min, n))
        : fallback;
    void updateSettings({ [key]: clamped } as Partial<Settings>);
    return String(clamped);
  };

  const handleExport = async () => {
    const payload = await exportData();
    try {
      await Share.share({ message: payload });
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleReset = () => {
    Alert.alert(t('settings.clearConfirmTitle'), t('settings.clearConfirmBody'), [
      { text: t('settings.cancel'), style: 'cancel' },
      {
        text: t('settings.confirm'),
        style: 'destructive',
        onPress: async () => {
          await resetAll();
          setCycleLen('28');
          setPeriodLen('5');
          setLutealLen('14');
        },
      },
    ]);
  };

  const handleSetPin = async () => {
    if (newPin.length < 4) {
      Alert.alert(t('onboarding.pinTooShort'));
      return;
    }
    if (newPin !== newPinConfirm) {
      Alert.alert(t('onboarding.pinMismatch'));
      return;
    }
    await updateProfile({ pinHash: hashPin(newPin) });
    setNewPin('');
    setNewPinConfirm('');
    Alert.alert(t('settings.pinSaved'));
  };

  const handleClearPin = async () => {
    await updateProfile({ pinHash: null });
    setNewPin('');
    setNewPinConfirm('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{t('settings.title')}</Text>

        <Section title={t('settings.profile')} colors={colors}>
          <Text style={styles.rowLabel}>{t('settings.name')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => {
              if (name.trim() !== data.profile.name) {
                void updateProfile({ name: name.trim() });
              }
            }}
            style={[styles.input, { marginTop: 8 }]}
            placeholder={t('settings.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
          {data.profile.birthdate ? (
            <Text style={[styles.rowLabel, { marginTop: 12, color: colors.textMuted, fontSize: 13 }]}>
              {t('settings.birthdate')}: {data.profile.birthdate}
            </Text>
          ) : null}
        </Section>

        <Section title={t('settings.cycleSetup')} colors={colors}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CycleWizard')}
          >
            <Text style={styles.actionBtnText}>{t('settings.openCycleWizard')}</Text>
          </Pressable>
          <Text style={[styles.rowLabel, { marginTop: 12, color: colors.textMuted, fontSize: 13 }]}>
            {t('settings.cycleSetupHint')}
          </Text>
        </Section>

        <Section title={t('settings.pinTitle')} colors={colors}>
          {data.profile.pinHash ? (
            <>
              <Text style={[styles.rowLabel, { color: colors.textMuted, fontSize: 13, marginBottom: 12 }]}>
                {t('settings.pinSet')}
              </Text>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                onPress={handleClearPin}
              >
                <Text style={styles.actionBtnText}>{t('settings.clearPin')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={newPin}
                onChangeText={(v) => setNewPin(v.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('settings.pinNew')}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
              <TextInput
                value={newPinConfirm}
                onChangeText={(v) => setNewPinConfirm(v.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('settings.pinConfirm')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { marginTop: 8 }]}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
              <Pressable style={[styles.actionBtn, { marginTop: 12 }]} onPress={handleSetPin}>
                <Text style={styles.actionBtnText}>{t('settings.savePin')}</Text>
              </Pressable>
            </>
          )}
        </Section>

        <Section title={t('settings.averageCycleLength')} colors={colors}>
          <TextInput
            value={cycleLen}
            onChangeText={setCycleLen}
            onBlur={() =>
              setCycleLen(
                commitNumber(cycleLen, 'averageCycleLength', 28, 15, 60),
              )
            }
            keyboardType="number-pad"
            style={styles.input}
          />
        </Section>

        <Section title={t('settings.averagePeriodLength')} colors={colors}>
          <TextInput
            value={periodLen}
            onChangeText={setPeriodLen}
            onBlur={() =>
              setPeriodLen(
                commitNumber(periodLen, 'averagePeriodLength', 5, 1, 14),
              )
            }
            keyboardType="number-pad"
            style={styles.input}
          />
        </Section>

        <Section title={t('settings.lutealPhase')} colors={colors}>
          <TextInput
            value={lutealLen}
            onChangeText={setLutealLen}
            onBlur={() =>
              setLutealLen(
                commitNumber(lutealLen, 'lutealPhaseLength', 14, 9, 17),
              )
            }
            keyboardType="number-pad"
            style={styles.input}
          />
        </Section>

        <Section title={t('settings.language')} colors={colors}>
          <View style={styles.chipRow}>
            {(['auto', 'en', 'ru'] as const).map((lng) => {
              const active = data.settings.language === lng;
              const label =
                lng === 'auto'
                  ? t('settings.languageAuto')
                  : lng === 'en'
                    ? t('settings.languageEn')
                    : t('settings.languageRu');
              return (
                <Pressable
                  key={lng}
                  onPress={() => updateSettings({ language: lng })}
                  style={[
                    styles.chip,
                    active && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && { color: colors.primaryText },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t('settings.showFertileWindow')} colors={colors}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.showFertileWindow')}</Text>
            <Switch
              value={data.settings.showFertileWindow}
              onValueChange={(v) => updateSettings({ showFertileWindow: v })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Section>

        <Pressable style={styles.actionBtn} onPress={handleExport}>
          <Text style={styles.actionBtnText}>{t('settings.exportData')}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.danger }]}
          onPress={handleReset}
        >
          <Text style={styles.actionBtnText}>{t('settings.clearData')}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>{t('settings.disclaimer')}</Text>
        <Text style={styles.version}>
          {t('settings.version')} {APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{
  title: string;
  colors: ReturnType<typeof useApp>['colors'];
  children: React.ReactNode;
}> = ({ title, colors, children }) => {
  const styles = makeStyles(colors);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useApp>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    h1: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    section: { marginBottom: 16 },
    sectionTitle: {
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 13,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionBody: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.surface,
    },
    chipText: { color: colors.text, fontSize: 14 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rowLabel: { color: colors.text, fontSize: 16 },
    actionBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    actionBtnText: {
      color: colors.primaryText,
      fontWeight: '700',
      fontSize: 16,
    },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 24,
      textAlign: 'center',
    },
    version: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 8,
      textAlign: 'center',
    },
  });
