import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { DayLog, Settings } from './types';

export const fmt = (d: Date): string => format(d, 'yyyy-MM-dd');

const isBleeding = (log: DayLog | undefined): boolean => {
  if (!log || !log.flow) return false;
  return log.flow !== 'none';
};

/**
 * Identifies cycle starts (first day of bleeding after at least one non-bleeding
 * day or no log). Returns ISO date strings sorted ascending.
 */
export const findPeriodStarts = (logs: Record<string, DayLog>): string[] => {
  const dates = Object.keys(logs)
    .filter((d) => isBleeding(logs[d]))
    .sort();
  if (dates.length === 0) return [];

  const starts: string[] = [];
  for (const d of dates) {
    const prev = fmt(addDays(parseISO(d), -1));
    if (!isBleeding(logs[prev])) {
      starts.push(d);
    }
  }
  return starts;
};

export interface CycleStats {
  cycleLengths: number[];
  averageCycleLength: number | null;
  shortestCycle: number | null;
  longestCycle: number | null;
  periodStarts: string[];
  averagePeriodLength: number | null;
}

export const computeCycleStats = (
  logs: Record<string, DayLog>,
  settings: Settings,
): CycleStats => {
  const periodStarts = findPeriodStarts(logs);
  const cycleLengths: number[] = [];
  for (let i = 1; i < periodStarts.length; i++) {
    const len = differenceInCalendarDays(
      parseISO(periodStarts[i]),
      parseISO(periodStarts[i - 1]),
    );
    if (len >= 15 && len <= 60) cycleLengths.push(len);
  }

  const avg =
    cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
      : null;

  // Compute average period length by counting consecutive bleeding days
  // starting from each detected period start.
  const periodLengths: number[] = [];
  for (const start of periodStarts) {
    let len = 0;
    let cursor = parseISO(start);
    while (isBleeding(logs[fmt(cursor)])) {
      len++;
      cursor = addDays(cursor, 1);
      if (len > 14) break; // safety
    }
    if (len > 0) periodLengths.push(len);
  }
  const avgPeriod =
    periodLengths.length > 0
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : null;

  return {
    cycleLengths,
    averageCycleLength: avg,
    shortestCycle: cycleLengths.length ? Math.min(...cycleLengths) : null,
    longestCycle: cycleLengths.length ? Math.max(...cycleLengths) : null,
    periodStarts,
    averagePeriodLength: avgPeriod,
  };
};

export interface CyclePredictions {
  lastPeriodStart: string | null;
  nextPeriodStart: string | null;
  nextPeriodEnd: string | null;
  ovulation: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  cycleDay: number | null; // 1-based day of current cycle
  daysUntilNextPeriod: number | null;
  effectiveCycleLength: number;
  effectivePeriodLength: number;
}

export const computePredictions = (
  logs: Record<string, DayLog>,
  settings: Settings,
  today: Date = new Date(),
): CyclePredictions => {
  const stats = computeCycleStats(logs, settings);
  const cycleLen = stats.averageCycleLength ?? settings.averageCycleLength;
  const periodLen = stats.averagePeriodLength ?? settings.averagePeriodLength;

  const lastStart = stats.periodStarts.length
    ? stats.periodStarts[stats.periodStarts.length - 1]
    : null;

  if (!lastStart) {
    return {
      lastPeriodStart: null,
      nextPeriodStart: null,
      nextPeriodEnd: null,
      ovulation: null,
      fertileStart: null,
      fertileEnd: null,
      cycleDay: null,
      daysUntilNextPeriod: null,
      effectiveCycleLength: cycleLen,
      effectivePeriodLength: periodLen,
    };
  }

  // Roll the predicted next-period start forward until it's in the future
  // relative to today, so predictions stay meaningful even if the user hasn't
  // logged the latest period yet.
  let nextStart = addDays(parseISO(lastStart), cycleLen);
  while (differenceInCalendarDays(nextStart, today) < 0) {
    nextStart = addDays(nextStart, cycleLen);
  }
  const nextEnd = addDays(nextStart, Math.max(0, periodLen - 1));
  const ovulation = addDays(nextStart, -settings.lutealPhaseLength);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  const cycleDay = differenceInCalendarDays(today, parseISO(lastStart)) + 1;
  const daysUntil = differenceInCalendarDays(nextStart, today);

  return {
    lastPeriodStart: lastStart,
    nextPeriodStart: fmt(nextStart),
    nextPeriodEnd: fmt(nextEnd),
    ovulation: fmt(ovulation),
    fertileStart: fmt(fertileStart),
    fertileEnd: fmt(fertileEnd),
    cycleDay: cycleDay > 0 ? cycleDay : null,
    daysUntilNextPeriod: daysUntil,
    effectiveCycleLength: cycleLen,
    effectivePeriodLength: periodLen,
  };
};

export type DayMarker =
  | 'period'
  | 'predictedPeriod'
  | 'ovulation'
  | 'fertile'
  | 'logged'
  | 'today';

export const buildDayMarkers = (
  logs: Record<string, DayLog>,
  predictions: CyclePredictions,
  settings: Settings,
  today: Date = new Date(),
): Record<string, DayMarker[]> => {
  const markers: Record<string, DayMarker[]> = {};
  const add = (date: string, m: DayMarker) => {
    if (!markers[date]) markers[date] = [];
    if (!markers[date].includes(m)) markers[date].push(m);
  };

  for (const [date, log] of Object.entries(logs)) {
    if (isBleeding(log)) add(date, 'period');
    else if (
      log.symptoms?.length ||
      log.moods?.length ||
      log.temperature !== undefined ||
      log.notes ||
      log.intimacy
    ) {
      add(date, 'logged');
    }
  }

  if (predictions.nextPeriodStart && predictions.nextPeriodEnd) {
    let cursor = parseISO(predictions.nextPeriodStart);
    const end = parseISO(predictions.nextPeriodEnd);
    while (differenceInCalendarDays(cursor, end) <= 0) {
      const d = fmt(cursor);
      if (!isBleeding(logs[d])) add(d, 'predictedPeriod');
      cursor = addDays(cursor, 1);
    }
  }

  if (settings.showFertileWindow) {
    if (predictions.fertileStart && predictions.fertileEnd) {
      let cursor = parseISO(predictions.fertileStart);
      const end = parseISO(predictions.fertileEnd);
      while (differenceInCalendarDays(cursor, end) <= 0) {
        add(fmt(cursor), 'fertile');
        cursor = addDays(cursor, 1);
      }
    }
    if (predictions.ovulation) add(predictions.ovulation, 'ovulation');
  }

  add(fmt(today), 'today');
  return markers;
};

const isBleedingExport = isBleeding;
export { isBleedingExport as isBleeding };
