import { scoreSeason } from './score';
import { getRules, type Rules } from './rules';
import { addDays, londonInstant } from './time';
import type { Activity, LocalDate, SeasonResult } from './types';

// A look back at past runs: the history is cut into consecutive three-week blocks and each
// block is scored as a season, with every runner's usual week worked out from the four weeks
// before it. Nobody made commitments for the past, so each runner is scored on keeping their
// own usual week. All points still come from scoreSeason.

const BASELINE_WEEKS = 4;
const BLOCK_DAYS = 21;
const MIN_HISTORY_RUN_DAYS = 2;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A runner's usual week before `blockStart`: average km and run days over the four weeks
 * before it, counting only runs long enough to qualify, one run a day. Null if they ran on
 * fewer than two days in that time, since that is not enough to call anything usual.
 */
export function deriveBaseline(
  rules: Rules,
  activities: Activity[],
  runnerId: string,
  blockStart: LocalDate,
): { baselineKm: number; baselineRuns: number } | null {
  const from = addDays(blockStart, -BASELINE_WEEKS * 7);
  const q = rules.qualifyingRun;
  const days = new Set<LocalDate>();
  let metres = 0;
  for (const a of activities) {
    if (a.runnerId !== runnerId || a.runDate < from || a.runDate >= blockStart) continue;
    if (a.durationS < q.minDurationS && a.distanceM < q.minDistanceM) continue;
    days.add(a.runDate);
    metres += a.distanceM;
  }
  if (days.size < MIN_HISTORY_RUN_DAYS) return null;
  return {
    baselineKm: Math.max(1, round1(metres / 1000 / BASELINE_WEEKS)),
    baselineRuns: Math.max(1, Math.round(days.size / BASELINE_WEEKS)),
  };
}

export interface LookBackInput {
  rulesVersion: string;
  runners: { id: string; name: string }[];
  activities: Activity[];
  /** A Monday: where the first block starts. */
  firstStart: LocalDate;
  blocks: number;
}

export interface LookBackBlock {
  startDate: LocalDate;
  endDate: LocalDate;
  /** Null if the block could not be scored; see `skipped`. */
  result: SeasonResult | null;
  skipped?: string;
}

export interface LookBackTotal {
  rank: number;
  runnerId: string;
  points: number;
  blocksPlayed: number;
  blocksWon: number;
}

export interface LookBackResult {
  blocks: LookBackBlock[];
  totals: LookBackTotal[];
}

export function lookBack(input: LookBackInput): LookBackResult {
  const rules = getRules(input.rulesVersion);
  const names = new Map(input.runners.map((r) => [r.id, r.name]));
  const tally = new Map(
    input.runners.map((r) => [r.id, { points: 0, blocksPlayed: 0, blocksWon: 0 }]),
  );
  const blocks: LookBackBlock[] = [];

  for (let i = 0; i < input.blocks; i++) {
    const startDate = addDays(input.firstStart, i * BLOCK_DAYS);
    const endDate = addDays(startDate, BLOCK_DAYS - 1);

    const entrants = input.runners.flatMap((r) => {
      const baseline = deriveBaseline(rules, input.activities, r.id, startDate);
      return baseline ? [{ id: r.id, name: r.name, ...baseline }] : [];
    });
    if (entrants.length < 1) {
      blocks.push({
        startDate,
        endDate,
        result: null,
        skipped: 'Needs at least one runner with four weeks of history.',
      });
      continue;
    }

    const ids = new Set(entrants.map((e) => e.id));
    const result = scoreSeason({
      season: { id: `look-back-${startDate}`, startDate, rulesVersion: input.rulesVersion },
      runners: entrants,
      commitments: [],
      // The past is not a live log: every run counts as logged on the day it was run.
      activities: input.activities
        .filter((a) => ids.has(a.runnerId) && a.runDate >= startDate && a.runDate <= endDate)
        .map((a) => ({ ...a, loggedAt: londonInstant(a.runDate, '23:59') })),
      bounties: [],
      asOf: londonInstant(addDays(endDate, rules.weekClose.daysAfterWeekStart + 2), '00:00'),
    });
    blocks.push({ startDate, endDate, result });

    for (const row of result.standings) {
      const t = tally.get(row.runnerId)!;
      t.points += row.points;
      t.blocksPlayed += 1;
      if (row.rank === 1) t.blocksWon += 1;
    }
  }

  const ordered = [...tally.entries()].sort(
    (a, b) =>
      b[1].points - a[1].points ||
      b[1].blocksWon - a[1].blocksWon ||
      (names.get(a[0]) ?? '').localeCompare(names.get(b[0]) ?? '') ||
      a[0].localeCompare(b[0]),
  );
  const totals: LookBackTotal[] = ordered.map(([runnerId, t], i) => ({
    ...t,
    runnerId,
    rank:
      i > 0 && ordered[i - 1]![1].points === t.points
        ? 0 // placeholder, fixed below
        : i + 1,
  }));
  for (let i = 0; i < totals.length; i++) {
    if (totals[i]!.rank === 0) totals[i]!.rank = totals[i - 1]!.rank;
  }
  return { blocks, totals };
}
