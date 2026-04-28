import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import { saveBoxProfile } from '../utils/firebase';
import {
  AllergyKey,
  BoxProfile,
  CareItem,
  DietKey,
  FlavorKey,
  GoalKey,
  HygieneType,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HYGIENE_OPTIONS: HygieneType[] = [
  'pads_regular',
  'pads_organic',
  'tampons',
  'cup',
  'period_underwear',
  'none',
];
const FLOW_OPTIONS: ('light' | 'medium' | 'heavy')[] = ['light', 'medium', 'heavy'];
const ALLERGY_OPTIONS: AllergyKey[] = [
  'chocolate',
  'nuts',
  'gluten',
  'lactose',
  'essential_oils',
  'fragrance',
  'latex',
];
const DIET_OPTIONS: DietKey[] = ['regular', 'healthy', 'vegetarian', 'vegan', 'sugar_free'];
const GOAL_OPTIONS: GoalKey[] = ['weight_loss', 'weight_gain', 'self_care'];
const FLAVOR_OPTIONS: FlavorKey[] = ['chocolate', 'fruits', 'citrus', 'mint'];
const CARE_OPTIONS: CareItem[] = [
  'face_masks',
  'eye_patches',
  'candles',
  'tea',
  'cream',
  'balm',
  'scrub',
];

export const BoxCustomizationScreen: React.FC = () => {
  const { data, colors, t, updateBoxProfile } = useApp();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [profile, setProfile] = useState<BoxProfile>({ ...data.boxProfile });
  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 5;

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const onSave = async () => {
    const next: BoxProfile = { ...profile, configured: true };
    await updateBoxProfile(next);
    void saveBoxProfile(data.profile.name || 'local', next);
    Alert.alert(t('box.savedTitle'));
    navigation.goBack();
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const Chip: React.FC<{
    active: boolean;
    onPress: () => void;
    label: string;
  }> = ({ active, onPress, label }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.chipText, active && { color: '#FFFCF7' }]}>
        {label}
      </Text>
    </Pressable>
  );

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <Text style={styles.stepTitle}>{t('box.s1Title')}</Text>
          <Text style={styles.stepHint}>{t('box.s1Hint')}</Text>
          <View style={styles.chipRow}>
            {HYGIENE_OPTIONS.map((h) => (
              <Chip
                key={h}
                label={t(`box.hygiene.${h}`)}
                active={profile.hygieneTypes.includes(h)}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    hygieneTypes: toggleArrayItem(p.hygieneTypes, h),
                  }))
                }
              />
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 18 }]}>{t('box.flow')}</Text>
          <View style={styles.chipRow}>
            {FLOW_OPTIONS.map((f) => (
              <Chip
                key={f}
                label={t(`box.flowLevel.${f}`)}
                active={profile.flowIntensity === f}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    flowIntensity: p.flowIntensity === f ? null : f,
                  }))
                }
              />
            ))}
          </View>
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <Text style={styles.stepTitle}>{t('box.s2Title')}</Text>
          <Text style={styles.stepHint}>{t('box.s2Hint')}</Text>
          <View style={styles.chipRow}>
            {ALLERGY_OPTIONS.map((a) => (
              <Chip
                key={a}
                label={t(`box.allergy.${a}`)}
                active={profile.allergies.includes(a)}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    allergies: toggleArrayItem(p.allergies, a),
                  }))
                }
              />
            ))}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('box.sensitiveSkin')}</Text>
            <Switch
              value={profile.sensitiveSkin}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, sensitiveSkin: v }))
              }
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <Text style={[styles.label, { marginTop: 14 }]}>{t('box.allergyNotes')}</Text>
          <TextInput
            style={styles.textarea}
            value={profile.allergyNotes}
            multiline
            numberOfLines={3}
            onChangeText={(v) => setProfile((p) => ({ ...p, allergyNotes: v }))}
            placeholder={t('box.allergyNotesPh')}
            placeholderTextColor={colors.textMuted}
          />
        </>
      );
    }
    if (step === 2) {
      return (
        <>
          <Text style={styles.stepTitle}>{t('box.s3Title')}</Text>
          <Text style={styles.stepHint}>{t('box.s3Hint')}</Text>
          <Text style={styles.label}>{t('box.diet')}</Text>
          <View style={styles.chipRow}>
            {DIET_OPTIONS.map((d) => (
              <Chip
                key={d}
                label={t(`box.dietKey.${d}`)}
                active={profile.diet === d}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    diet: p.diet === d ? null : d,
                  }))
                }
              />
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 14 }]}>{t('box.goal')}</Text>
          <View style={styles.chipRow}>
            {GOAL_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={t(`box.goalKey.${g}`)}
                active={profile.goal === g}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    goal: p.goal === g ? null : g,
                  }))
                }
              />
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 14 }]}>{t('box.flavors')}</Text>
          <View style={styles.chipRow}>
            {FLAVOR_OPTIONS.map((f) => (
              <Chip
                key={f}
                label={t(`box.flavor.${f}`)}
                active={profile.favoriteFlavors.includes(f)}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    favoriteFlavors: toggleArrayItem(p.favoriteFlavors, f),
                  }))
                }
              />
            ))}
          </View>
        </>
      );
    }
    if (step === 3) {
      return (
        <>
          <Text style={styles.stepTitle}>{t('box.s4Title')}</Text>
          <Text style={styles.stepHint}>{t('box.s4Hint')}</Text>
          <View style={styles.chipRow}>
            {CARE_OPTIONS.map((c) => (
              <Chip
                key={c}
                label={t(`box.care.${c}`)}
                active={profile.careItems.includes(c)}
                onPress={() =>
                  setProfile((p) => ({
                    ...p,
                    careItems: toggleArrayItem(p.careItems, c),
                  }))
                }
              />
            ))}
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t('box.surpriseGift')}</Text>
            <Switch
              value={profile.surpriseGift}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, surpriseGift: v }))
              }
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </>
      );
    }
    return (
      <>
        <Text style={styles.stepTitle}>{t('box.s5Title')}</Text>
        <Text style={styles.stepHint}>{t('box.s5Hint')}</Text>
        <Text style={styles.label}>{t('box.brandPreferences')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={2}
          value={profile.brandPreferences}
          onChangeText={(v) =>
            setProfile((p) => ({ ...p, brandPreferences: v }))
          }
          placeholder={t('box.brandPreferencesPh')}
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('box.wantsSamples')}</Text>
          <Switch
            value={profile.wantsSamples}
            onValueChange={(v) =>
              setProfile((p) => ({ ...p, wantsSamples: v }))
            }
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <Text style={[styles.label, { marginTop: 14 }]}>{t('box.notes')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={3}
          value={profile.notes}
          onChangeText={(v) => setProfile((p) => ({ ...p, notes: v }))}
          placeholder={t('box.notesPh')}
          placeholderTextColor={colors.textMuted}
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.h1}>{t('box.title')}</Text>
          <Text style={styles.progress}>
            {t('box.stepCounter', { current: step + 1, total: TOTAL_STEPS })}
          </Text>
          <View style={styles.dotsRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step
                    ? { backgroundColor: colors.primary, width: 22 }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>
          <View style={styles.card}>{renderStep()}</View>

          <View style={styles.navRow}>
            <Pressable
              style={[styles.navBtn, styles.navBtnGhost]}
              onPress={step === 0 ? () => navigation.goBack() : prev}
            >
              <Text style={[styles.navBtnText, { color: colors.primary }]}>
                {step === 0 ? t('box.cancel') : t('box.back')}
              </Text>
            </Pressable>
            {step < TOTAL_STEPS - 1 ? (
              <Pressable style={styles.navBtn} onPress={next}>
                <Text style={styles.navBtnText}>{t('box.next')}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.navBtn} onPress={onSave}>
                <Text style={styles.navBtnText}>{t('box.save')}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    h1: {
      fontSize: 28,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      color: colors.primary,
      marginTop: 8,
    },
    progress: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
    dotsRow: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 16 },
    dot: { height: 6, width: 6, borderRadius: 3 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      fontFamily: SERIF_STACK,
    },
    stepHint: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 6,
      marginBottom: 14,
      lineHeight: 18,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipText: { color: colors.text, fontSize: 13.5, fontWeight: '500' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    textarea: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 12,
      fontSize: 14.5,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 70,
      textAlignVertical: 'top',
    },
    navRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    navBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: 999,
      alignItems: 'center',
    },
    navBtnGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    navBtnText: { color: '#FFFCF7', fontSize: 15, fontWeight: '700' },
  });
