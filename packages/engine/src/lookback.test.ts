import { describe, expect, it } from 'vitest';
import { deriveBaseline, lookBack } from './lookback';
import { rulesV1 } from './rules';
import { run } from './test-helpers';
import type { Activity } from './types';

// Weeks start on Mondays. 2026-06-01 is a Monday.
const day = (start: string, offset: number) =>
  new Date(Date.parse(`${start}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);

/** `perWeek` runs of `km` each, in each of `weeks` weeks from `start`, on Mon/Wed/Fri/Sat. */
function weekly(id: string, start: string, weeks: number, perWeek: number, km: number): Activity[] {
  const out: Activity[] = [];
  for (let w = 0; w < weeks; w++) {
    for (const d of [0, 2, 4, 5].slice(0, perWeek)) {
      out.push(run(id, day(start, w * 7 + d), km));
    }
  }
  return out;
}

describe('deriveBaseline', () => {
  it('averages the four weeks before the block', () => {
    const acts = weekly('a', '2026-06-01', 4, 3, 7); // 3 runs x 7 km a week
    expect(deriveBaseline(rulesV1, acts, 'a', '2026-06-29')).toEqual({
      baselineKm: 21,
      baselineRuns: 3,
    });
  });

  it('ignores runs outside those four weeks and runs too short to count', () => {
    const acts = [
      ...weekly('a', '2026-05-04', 2, 3, 7), // too early
      ...weekly('a', '2026-06-01', 4, 2, 5),
      run('a', '2026-06-03', 0.5, { durationS: 120 }), // too short
      run('a', '2026-06-30', 9), // inside the block itself
    ];
    expect(deriveBaseline(rulesV1, acts, 'a', '2026-06-29')).toEqual({
      baselineKm: 10,
      baselineRuns: 2,
    });
  });

  it('counts one run per day', () => {
    const acts = [run('a', '2026-06-01', 5), run('a', '2026-06-01', 5), run('a', '2026-06-08', 5)];
    expect(deriveBaseline(rulesV1, acts, 'a', '2026-06-29')).toEqual({
      baselineKm: 3.8,
      baselineRuns: 1,
    });
  });

  it('returns null without enough history', () => {
    expect(deriveBaseline(rulesV1, [run('a', '2026-06-02', 5)], 'a', '2026-06-29')).toBeNull();
    expect(deriveBaseline(rulesV1, [], 'a', '2026-06-29')).toBeNull();
  });
});

describe('lookBack', () => {
  const runners = [
    { id: 'a', name: 'Alex' },
    { id: 'b', name: 'Bea' },
  ];
  // 4 weeks of history, then 6 weeks (two blocks).
  const history = (id: string, perWeek: number, km: number) =>
    weekly(id, '2026-06-01', 10, perWeek, km);

  it('scores consecutive three-week blocks and totals them', () => {
    const result = lookBack({
      rulesVersion: 'v1',
      runners,
      firstStart: '2026-06-29',
      blocks: 2,
      activities: [...history('a', 2, 10), ...history('b', 3, 5)],
    });
    expect(result.blocks.map((b) => [b.startDate, b.endDate])).toEqual([
      ['2026-06-29', '2026-07-19'],
      ['2026-07-20', '2026-08-09'],
    ]);
    expect(result.blocks.every((b) => b.result !== null)).toBe(true);
    // Both keep their own normal week every week. Alex finishes his km first, so wins the duels.
    expect(result.totals[0]).toMatchObject({ runnerId: 'a', rank: 1 });
    expect(result.totals[1]).toMatchObject({ runnerId: 'b', rank: 2 });
    expect(result.totals[0]!.points).toBeGreaterThan(result.totals[1]!.points);
    expect(result.totals[0]!.blocksPlayed).toBe(2);
    const sum = result.blocks.reduce(
      (s, b) => s + b.result!.standings.find((r) => r.runnerId === 'a')!.points,
      0,
    );
    expect(result.totals[0]!.points).toBe(sum);
  });

  it('counts block wins', () => {
    const result = lookBack({
      rulesVersion: 'v1',
      runners,
      firstStart: '2026-06-29',
      blocks: 2,
      activities: [...history('a', 2, 10), ...history('b', 3, 5)],
    });
    expect(result.totals.find((t) => t.runnerId === 'a')!.blocksWon).toBe(2);
    expect(result.totals.find((t) => t.runnerId === 'b')!.blocksWon).toBe(0);
  });

  it('scores a block with just one runner who has history, and leaves out the rest', () => {
    const result = lookBack({
      rulesVersion: 'v1',
      runners,
      firstStart: '2026-06-29',
      blocks: 1,
      activities: history('a', 3, 7),
    });
    const block = result.blocks[0]!;
    expect(block.result).not.toBeNull();
    expect(block.result!.weeks[0]!.runners.map((r) => r.runnerId)).toEqual(['a']);
    expect(result.totals.find((t) => t.runnerId === 'a')!.blocksPlayed).toBe(1);
    expect(result.totals.find((t) => t.runnerId === 'a')!.points).toBeGreaterThan(0);
    expect(result.totals.find((t) => t.runnerId === 'b')!.blocksPlayed).toBe(0);
  });

  it('skips a block where nobody has four weeks of history', () => {
    const result = lookBack({
      rulesVersion: 'v1',
      runners,
      firstStart: '2026-06-29',
      blocks: 1,
      activities: [],
    });
    expect(result.blocks[0]!.result).toBeNull();
    expect(result.blocks[0]!.skipped).toBe('Needs at least one runner with four weeks of history.');
    expect(result.totals.every((t) => t.blocksPlayed === 0)).toBe(true);
  });

  it('is deterministic', () => {
    const input = {
      rulesVersion: 'v1',
      runners,
      firstStart: '2026-06-29',
      blocks: 2,
      activities: [...history('a', 2, 10), ...history('b', 3, 5)],
    };
    expect(lookBack(input)).toEqual(lookBack(input));
  });

  it('does not count runs from before a block towards that block', () => {
    const result = lookBack({
      rulesVersion: 'v1',
      runners,
      firstStart: '2026-06-29',
      blocks: 1,
      activities: [...history('a', 2, 10), ...history('b', 3, 5)].filter(
        (a) => a.runDate >= '2026-06-01',
      ),
    });
    const week0 = result.blocks[0]!.result!.weeks[0]!;
    expect(week0.runners.every((r) => r.runs.every((x) => x.runDate >= '2026-06-29'))).toBe(true);
  });
});
