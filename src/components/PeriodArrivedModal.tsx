import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format, parseISO } from 'date-fns';

import { ThemeColors } from '../theme';
import { datesAroundToday, formatChipLabel } from '../hooks/useCycleCorrection';

type Mode = 'choose' | 'pickEarlier' | 'pickLater';

interface Props {
  visible: boolean;
  predictedDate: string | null;
  colors: ThemeColors;
  onClose: () => void;
  /** Called with the chosen ISO start date. */
  onConfirm: (isoDate: string) => Promise<void> | void;
}

const formatRu = (iso: string): string => {
  const d = parseISO(iso);
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

export const PeriodArrivedModal: React.FC<Props> = ({
  visible,
  predictedDate,
  colors,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<Mode>('choose');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode('choose');
    setBusy(false);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleToday = async () => {
    setBusy(true);
    const iso = format(new Date(), 'yyyy-MM-dd');
    await onConfirm(iso);
    reset();
    onClose();
  };

  const handleDatePicked = async (iso: string) => {
    setBusy(true);
    await onConfirm(iso);
    reset();
    onClose();
  };

  const styles = makeStyles(colors);

  // For "earlier" we offer dates from -7 days up to today (inclusive).
  // For "later"  we offer the same range — both flows let the user pick the
  // exact day she actually started; "позже" just means later than predicted,
  // not later than today.
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const earlierDates = datesAroundToday(7).filter((d) => d <= todayIso);
  const laterDates = datesAroundToday(7).filter((d) => d <= todayIso);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {mode === 'choose' && (
          <>
            <Text style={styles.title}>Месячные пришли</Text>
            {predictedDate && (
              <Text style={styles.subtitle}>
                Прогноз был на {formatRu(predictedDate)}. Уточни, как было на
                самом деле — я пересчитаю всё дальше.
              </Text>
            )}
            <Pressable
              style={[styles.choice, { backgroundColor: colors.primary }]}
              disabled={busy}
              onPress={handleToday}
            >
              <Text style={[styles.choiceText, { color: '#FFFFFF' }]}>
                Начались сегодня
              </Text>
            </Pressable>
            <Pressable
              style={styles.choiceSecondary}
              disabled={busy}
              onPress={() => setMode('pickEarlier')}
            >
              <Text style={styles.choiceSecondaryText}>Начались раньше</Text>
            </Pressable>
            <Pressable
              style={styles.choiceSecondary}
              disabled={busy}
              onPress={() => setMode('pickLater')}
            >
              <Text style={styles.choiceSecondaryText}>Начались позже</Text>
            </Pressable>
            <Pressable style={styles.cancel} onPress={handleClose}>
              <Text style={styles.cancelText}>Отмена</Text>
            </Pressable>
          </>
        )}

        {(mode === 'pickEarlier' || mode === 'pickLater') && (
          <>
            <Text style={styles.title}>
              {mode === 'pickEarlier' ? 'Когда раньше?' : 'Когда позже?'}
            </Text>
            <Text style={styles.subtitle}>
              Выбери день фактического начала.
            </Text>
            <ScrollView style={styles.chipScroll} contentContainerStyle={styles.chips}>
              {(mode === 'pickEarlier' ? earlierDates : laterDates).map((iso) => (
                <Pressable
                  key={iso}
                  style={styles.chip}
                  disabled={busy}
                  onPress={() => handleDatePicked(iso)}
                >
                  <Text style={styles.chipText}>{formatChipLabel(iso)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.cancel} onPress={() => setMode('choose')}>
              <Text style={styles.cancelText}>Назад</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 16,
      lineHeight: 20,
    },
    choice: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 10,
    },
    choiceText: {
      fontSize: 16,
      fontWeight: '700',
    },
    choiceSecondary: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    choiceSecondaryText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    cancel: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    chipScroll: {
      maxHeight: 320,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    chip: {
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
