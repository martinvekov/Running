import type { Activity, Commitment, Runner, SeasonInput } from './types';

// Test-only builders. Season 1 starts Monday 2 Nov 2026 (GMT, so London time equals UTC).
export const START = '2026-11-02';
export const AFTER_SEASON = '2026-11-30T00:00:00Z';

export function runner(id: string, baselineKm = 20, baselineRuns = 3): Runner {
  return { id, name: id.toUpperCase(), baselineKm, baselineRuns };
}

let seq = 0;
export function run(
  runnerId: string,
  runDate: string,
  km: number,
  opts: Partial<Activity> = {},
): Activity {
  seq += 1;
  return {
    id: opts.id ?? `${runnerId}-${runDate}-${seq}`,
    runnerId,
    source: 'manual',
    runDate,
    durationS: Math.round(km * 6 * 60),
    distanceM: Math.round(km * 1000),
    loggedAt: `${runDate}T20:00:00Z`,
    ...opts,
  };
}

export function commit(
  runnerId: string,
  weekIndex: number,
  km: number,
  runs: number,
  committedAt = '2026-11-01T12:00:00Z',
): Commitment {
  return { runnerId, weekIndex, km, runs, committedAt };
}

export function season(partial: Partial<SeasonInput> = {}): SeasonInput {
  return {
    season: { id: 'season-1', startDate: START, rulesVersion: 'v1' },
    runners: [],
    commitments: [],
    activities: [],
    bounties: [],
    asOf: AFTER_SEASON,
    ...partial,
  };
}
