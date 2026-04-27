import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, format } from 'date-fns';
import {
  computeCycleStats,
  computePredictions,
  findPeriodStarts,
  buildDayMarkers,
  buildPhaseSegments,
  phaseForCycleDay,
  fertileWindowInfo,
} from '../src/cycle';
import { DEFAULT_SETTINGS, DayLog, Settings } from '../src/types';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

const makePeriod = (start: Date, days: number): Record<string, DayLog> => {
  const out: Record<string, DayLog> = {};
  for (let i = 0; i < days; i++) {
    const d = fmt(addDays(start, i));
    out[d] = {
      date: d,
      flow: i === 0 ? 'medium' : i < days - 1 ? 'light' : 'spotting',
    };
  }
  return out;
};

test('findPeriodStarts detects each cycle start', () => {
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-01-01'), 5),
    ...makePeriod(new Date('2024-01-29'), 4),
    ...makePeriod(new Date('2024-02-26'), 5),
  };
  const starts = findPeriodStarts(logs);
  assert.deepEqual(starts, ['2024-01-01', '2024-01-29', '2024-02-26']);
});

test('computeCycleStats averages cycle and period lengths', () => {
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-01-01'), 5),
    ...makePeriod(new Date('2024-01-29'), 5),
    ...makePeriod(new Date('2024-02-26'), 5),
  };
  const stats = computeCycleStats(logs, DEFAULT_SETTINGS);
  assert.equal(stats.cycleLengths.length, 2);
  assert.equal(stats.averageCycleLength, 28);
  assert.equal(stats.averagePeriodLength, 5);
  assert.equal(stats.shortestCycle, 28);
  assert.equal(stats.longestCycle, 28);
});

test('computeCycleStats ignores nonsensical gaps', () => {
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-01-01'), 5),
    ...makePeriod(new Date('2024-06-01'), 5), // 152 days gap, ignored
  };
  const stats = computeCycleStats(logs, DEFAULT_SETTINGS);
  assert.equal(stats.cycleLengths.length, 0);
  assert.equal(stats.averageCycleLength, null);
});

test('computePredictions rolls forward past today', () => {
  const today = new Date('2024-03-10');
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-01-01'), 5),
    ...makePeriod(new Date('2024-01-29'), 5),
    ...makePeriod(new Date('2024-02-26'), 5),
  };
  const predictions = computePredictions(logs, DEFAULT_SETTINGS, today);
  assert.equal(predictions.lastPeriodStart, '2024-02-26');
  assert.equal(predictions.nextPeriodStart, '2024-03-25');
  assert.equal(predictions.ovulation, '2024-03-11');
  assert.equal(predictions.fertileStart, '2024-03-06');
  assert.equal(predictions.fertileEnd, '2024-03-12');
  assert.equal(predictions.cycleDay, 14);
  assert.equal(predictions.daysUntilNextPeriod, 15);
  assert.equal(predictions.effectiveCycleLength, 28);
});

test('computePredictions handles late period (negative days remaining)', () => {
  const today = new Date('2024-04-05');
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-03-01'), 5),
  };
  const predictions = computePredictions(logs, DEFAULT_SETTINGS, today);
  // Predicted next period was 2024-03-29; today is 2024-04-05 (7 days late).
  // Falls back to first prediction in the future when one exists.
  assert.equal(predictions.lastPeriodStart, '2024-03-01');
  assert.equal(predictions.nextPeriodStart, '2024-04-26');
});

test('computePredictions returns nulls without history', () => {
  const predictions = computePredictions({}, DEFAULT_SETTINGS, new Date('2024-01-01'));
  assert.equal(predictions.lastPeriodStart, null);
  assert.equal(predictions.nextPeriodStart, null);
  assert.equal(predictions.ovulation, null);
});

test('buildDayMarkers tags period, predicted period, fertile, ovulation', () => {
  const today = new Date('2024-03-10');
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-02-26'), 5),
  };
  const predictions = computePredictions(logs, DEFAULT_SETTINGS, today);
  const settings: Settings = { ...DEFAULT_SETTINGS, showFertileWindow: true };
  const markers = buildDayMarkers(logs, predictions, settings, today);

  assert.ok(markers['2024-02-26']?.includes('period'));
  assert.ok(markers['2024-03-25']?.includes('predictedPeriod'));
  assert.ok(markers['2024-03-11']?.includes('ovulation'));
  assert.ok(markers['2024-03-08']?.includes('fertile'));
  assert.ok(markers['2024-03-10']?.includes('today'));
});

test('buildDayMarkers omits fertile window when disabled', () => {
  const today = new Date('2024-03-10');
  const logs: Record<string, DayLog> = {
    ...makePeriod(new Date('2024-02-26'), 5),
  };
  const predictions = computePredictions(logs, DEFAULT_SETTINGS, today);
  const markers = buildDayMarkers(
    logs,
    predictions,
    { ...DEFAULT_SETTINGS, showFertileWindow: false },
    today,
  );
  assert.notEqual(markers['2024-03-08']?.includes('fertile'), true);
  assert.notEqual(markers['2024-03-11']?.includes('ovulation'), true);
});

test('buildDayMarkers tags days with only symptoms as logged', () => {
  const today = new Date('2024-03-10');
  const logs: Record<string, DayLog> = {
    '2024-03-05': { date: '2024-03-05', symptoms: ['cramps'] },
  };
  const predictions = computePredictions(logs, DEFAULT_SETTINGS, today);
  const markers = buildDayMarkers(logs, predictions, DEFAULT_SETTINGS, today);
  assert.ok(markers['2024-03-05']?.includes('logged'));
});

test('buildPhaseSegments covers the entire cycle without gaps', () => {
  const segs = buildPhaseSegments(28, 5, 14);
  assert.equal(segs[0].startDay, 1);
  assert.equal(segs[segs.length - 1].endDay, 28);
  for (let i = 1; i < segs.length; i++) {
    assert.equal(
      segs[i].startDay,
      segs[i - 1].endDay + 1,
      `segments must be contiguous around index ${i}`,
    );
  }
  const ovIdx = segs.findIndex((s) => s.phase === 'ovulation');
  assert.notEqual(ovIdx, -1);
  assert.equal(segs[ovIdx].startDay, 14);
  assert.equal(segs[ovIdx].endDay, 14);
});

test('phaseForCycleDay returns expected phases', () => {
  const segs = buildPhaseSegments(28, 5, 14);
  assert.equal(phaseForCycleDay(1, segs), 'period');
  assert.equal(phaseForCycleDay(5, segs), 'period');
  assert.equal(phaseForCycleDay(7, segs), 'follicular');
  assert.equal(phaseForCycleDay(10, segs), 'fertile');
  assert.equal(phaseForCycleDay(14, segs), 'ovulation');
  assert.equal(phaseForCycleDay(15, segs), 'fertile');
  assert.equal(phaseForCycleDay(20, segs), 'luteal');
  assert.equal(phaseForCycleDay(28, segs), 'luteal');
});

test('fertileWindowInfo computes remaining days inside window', () => {
  const segs = buildPhaseSegments(28, 5, 14);
  const before = fertileWindowInfo(7, segs);
  assert.equal(before.isInside, false);
  assert.equal(before.total, 7);

  const inside = fertileWindowInfo(12, segs);
  assert.equal(inside.isInside, true);
  assert.equal(inside.remaining, 4);
  assert.equal(inside.total, 7);

  const after = fertileWindowInfo(20, segs);
  assert.equal(after.isInside, false);
  assert.equal(after.remaining, 0);
});
