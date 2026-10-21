import { scoreSeason, type RunnerWeek, type SeasonInput } from '@crew/engine';

// A worked example for the "how it works" card. The points come from the engine, not from
// arithmetic here, so the example can never drift from the rules.

export const EXAMPLE = {
  name: 'Sam',
  usual: { km: 20, runs: 3 },
  committed: { km: 22, runs: 3 },
  did: { km: 22.5, runs: 3 },
};

function exampleInput(): SeasonInput {
  const days = ['2026-11-02', '2026-11-04', '2026-11-06'];
  return {
    season: { id: 'how-it-works', startDate: '2026-11-02', rulesVersion: 'v1' },
    runners: [
      {
        id: 'sam',
        name: EXAMPLE.name,
        baselineKm: EXAMPLE.usual.km,
        baselineRuns: EXAMPLE.usual.runs,
      },
    ],
    commitments: [
      {
        runnerId: 'sam',
        weekIndex: 0,
        km: EXAMPLE.committed.km,
        runs: EXAMPLE.committed.runs,
        committedAt: '2026-11-01T18:00:00Z',
      },
    ],
    activities: days.map((runDate, i) => ({
      id: `example-${i}`,
      runnerId: 'sam',
      source: 'strava' as const,
      runDate,
      durationS: 2700,
      distanceM: (EXAMPLE.did.km / EXAMPLE.did.runs) * 1000,
      loggedAt: `${runDate}T20:00:00Z`,
    })),
    bounties: [],
    asOf: '2026-11-10T00:00:00Z',
  };
}

export const exampleWeek: RunnerWeek = scoreSeason(exampleInput()).weeks[0]!.runners[0]!;
