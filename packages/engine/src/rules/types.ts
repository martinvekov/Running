/** A clock time in Europe/London, HH:MM. Deadlines include the whole minute. */
export type LocalTime = string;

export interface Rules {
  version: string;
  timeZone: 'Europe/London';
  seasonWeeks: number;
  commitDeadline: { daysBeforeWeekStart: number; time: LocalTime };
  weekClose: { daysAfterWeekStart: number; time: LocalTime };
  qualifyingRun: { minDurationS: number; minDistanceM: number; logWindowDays: number };
  commitmentBand: {
    minKmPct: number;
    maxKmPct: number;
    runsBelow: number;
    runsAbove: number;
    minRuns: number;
  };
  showUp: { pointsPerRun: number; maxRuns: number };
  /** Tiers, best first. The first tier a runner meets applies. */
  keepWord: { points: number; minKmPct: number; maxRunsShort: number }[];
  ambition: { stepPct: number; pointsPerStep: number; maxPoints: number };
  duel: { win: number; draw: number; loss: number; drawGapPct: number };
  bounty: { points: number };
}
