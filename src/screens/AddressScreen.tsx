import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../AppContext';
import { RootStackParamList } from '../navigation';
import { SERIF_STACK, WaveBackground } from '../components/WaveBackground';
import { ThemeColors } from '../theme';
import { saveAddress } from '../utils/firebase';
import { ShippingAddress } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FieldDef {
  key: keyof ShippingAddress;
  labelKey: string;
  placeholderKey: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  autoCap?: 'none' | 'words';
}

const FIELDS: FieldDef[] = [
  { key: 'country', labelKey: 'address.country', placeholderKey: 'address.countryPh', autoCap: 'words' },
  { key: 'city', labelKey: 'address.city', placeholderKey: 'address.cityPh', autoCap: 'words' },
  { key: 'street', labelKey: 'address.street', placeholderKey: 'address.streetPh', autoCap: 'words' },
  { key: 'building', labelKey: 'address.building', placeholderKey: 'address.buildingPh' },
  { key: 'apartment', labelKey: 'address.apartment', placeholderKey: 'address.apartmentPh' },
  { key: 'postalCode', labelKey: 'address.postalCode', placeholderKey: 'address.postalCodePh', keyboardType: 'numeric' },
  { key: 'phone', labelKey: 'address.phone', placeholderKey: 'address.phonePh', keyboardType: 'phone-pad' },
];

export const AddressScreen: React.FC = () => {
  const { data, colors, t, updateShippingAddress, profile } = useAppHelpers();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [draft, setDraft] = useState<ShippingAddress>({ ...data.shippingAddress });
  const [busy, setBusy] = useState(false);

  const onChange = (key: keyof ShippingAddress, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const isValid = useMemo(() => {
    return Boolean(
      draft.country.trim() &&
        draft.city.trim() &&
        draft.street.trim() &&
        draft.building.trim() &&
        draft.phone.trim(),
    );
  }, [draft]);

  const onSave = async () => {
    if (!isValid) {
      Alert.alert(t('address.fillRequired'));
      return;
    }
    setBusy(true);
    await updateShippingAddress(draft);
    void saveAddress(profile, draft);
    setBusy(false);
    if (!data.boxProfile.configured) {
      navigation.navigate('BoxCustomization');
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WaveBackground colors={colors} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>{t('address.title')}</Text>
          <Text style={styles.subtitle}>{t('address.hint')}</Text>

          {FIELDS.map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{t(f.labelKey)}</Text>
              <TextInput
                style={styles.input}
                value={draft[f.key]}
                onChangeText={(v) => onChange(f.key, v)}
                placeholder={t(f.placeholderKey)}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.keyboardType ?? 'default'}
                autoCapitalize={f.autoCap ?? 'none'}
              />
            </View>
          ))}

          <Pressable
            style={[styles.cta, !isValid && { opacity: 0.5 }]}
            onPress={onSave}
            disabled={!isValid || busy}
          >
            <Text style={styles.ctaText}>{t('address.save')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// AppContext doesn't expose `profile` directly outside `data`; tiny helper here
// keeps the screen body readable.
const useAppHelpers = () => {
  const { data, colors, t, updateShippingAddress } = useApp();
  return { data, colors, t, updateShippingAddress, profile: data.profile.name || 'local' };
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    h1: {
      fontSize: 30,
      fontFamily: SERIF_STACK,
      fontWeight: '300',
      color: colors.primary,
      marginTop: 8,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 6,
      marginBottom: 20,
      lineHeight: 20,
    },
    field: { marginBottom: 14 },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cta: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
      marginTop: 12,
    },
    ctaText: { color: '#FFFCF7', fontSize: 15, fontWeight: '700' },
  });
