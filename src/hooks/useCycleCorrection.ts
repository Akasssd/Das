import { useCallback } from 'react';
import { addDays, format, parseISO } from 'date-fns';

import { useApp } from '../AppContext';
import { findPeriodStarts, fmt } from '../cycle';

const isoToday = (): string => format(new Date(), 'yyyy-MM-dd');

const isBleedingFlow = (flow: string | undefined): boolean =>
  !!flow && flow !== 'none';

export interface CycleCorrectionApi {
  /** Are we within ±3 days of the predicted next-period start? */
  isAroundPredicted: boolean;
  /** Is today the predicted start, ±3 days? */
  predictedDate: string | null;
  /**
   * Mark a period start on the given ISO date. When the date matches an
   * existing bleeding day we keep the user's flow value; otherwise we add a
   * `medium` flow log so the next predictions key off this date.
   */
  markPeriodStart: (isoDate: string) => Promise<void>;
  /** Convenience for the "today" path. */
  markStartedToday: () => Promise<void>;
}

export const useCycleCorrection = (): CycleCorrectionApi => {
  const { data, predictions, upsertLogs } = useApp();

  const isAroundPredicted = (() => {
    const days = predictions.daysUntilNextPeriod;
    if (days === null) return false;
    return Math.abs(days) <= 3;
  })();

  const markPeriodStart = useCallback(
    async (isoDate: string) => {
      // Don't downgrade an existing flow log; only add `medium` if absent.
      const existing = data.logs[isoDate];
      const nextLogs = [];
      if (!existing || !isBleedingFlow(existing.flow)) {
        nextLogs.push({
          ...(existing ?? { date: isoDate }),
          date: isoDate,
          flow: 'medium' as const,
        });
      }

      // If the user picked a date earlier than the most recently detected
      // period start, also clear any "phantom" bleeding logs that lie
      // between the picked date and today and might have been from an
      // accidental tap. We only touch single-day entries to be safe.
      const starts = findPeriodStarts(data.logs);
      const lastStart = starts.length ? starts[starts.length - 1] : null;
      if (lastStart && lastStart > isoDate) {
        // The user is correcting backwards: keep older logs as-is, just add
        // the new start. The new start is older than `lastStart`, so the
        // statistics will treat it as part of the same older cycle —
        // that's the desired behaviour ("the previous prediction was wrong,
        // here's the actual start").
      }

      if (nextLogs.length > 0) {
        await upsertLogs(nextLogs);
      }
    },
    [data.logs, upsertLogs],
  );

  const markStartedToday = useCallback(
    async () => {
      await markPeriodStart(isoToday());
    },
    [markPeriodStart],
  );

  // We expose the predicted date so the modal/button can mention it.
  const predictedDate = predictions.nextPeriodStart;

  return {
    isAroundPredicted,
    predictedDate,
    markPeriodStart,
    markStartedToday,
  };
};

/** Helper used by the modal: a list of ISO dates around today (±N days). */
export const datesAroundToday = (radiusDays = 7): string[] => {
  const today = new Date();
  const out: string[] = [];
  for (let d = -radiusDays; d <= radiusDays; d++) {
    out.push(fmt(addDays(today, d)));
  }
  return out;
};

/** Format an ISO date as e.g. `пн, 5 мая` for the modal chips. */
export const formatChipLabel = (iso: string): string => {
  const date = parseISO(iso);
  const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][date.getDay()];
  const months = [
    'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ];
  return `${wd}, ${date.getDate()} ${months[date.getMonth()]}`;
};
