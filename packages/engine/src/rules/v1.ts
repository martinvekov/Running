import type { Rules } from './types';

export const rulesV1: Rules = {
  version: 'v1',
  timeZone: 'Europe/London',
  seasonWeeks: 3,
  // Sunday 23:59 before the week starts.
  commitDeadline: { daysBeforeWeekStart: 1, time: '23:59' },
  // Monday 12:00 after the week ends.
  weekClose: { daysAfterWeekStart: 7, time: '12:00' },
  qualifyingRun: { minDurationS: 15 * 60, minDistanceM: 2000, logWindowDays: 2 },
  commitmentBand: { minKmPct: 80, maxKmPct: 130, runsBelow: 1, runsAbove: 2, minRuns: 1 },
  showUp: { pointsPerRun: 5, maxRuns: 4 },
  keepWord: [
    { points: 15, minKmPct: 95, maxRunsShort: 0 },
    { points: 8, minKmPct: 75, maxRunsShort: 1 },
  ],
  ambition: { stepPct: 10, pointsPerStep: 1, maxPoints: 3 },
  duel: { win: 10, draw: 5, loss: 0, drawGapPct: 5 },
  bounty: { points: 5 },
};
