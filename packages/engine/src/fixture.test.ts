import { describe, expect, it } from 'vitest';
import { fiveRunners } from '../fixtures';
import { scoreSeason } from './score';

describe('five-runner fixture', () => {
  const result = scoreSeason(fiveRunners);

  it('produces the reviewed season standings', () => {
    // Update deliberately when the rules or the fixture change, after re-reading the sim report.
    expect(result.standings.map((s) => [s.runnerId, s.points])).toEqual([
      ['priya', 137],
      ['alex', 123],
      ['dan', 105],
      ['jo', 96],
      ['sam', 56],
    ]);
  });

  it('never exceeds 53 points in a week', () => {
    for (const week of result.weeks) {
      for (const r of week.runners) expect(r.points).toBeLessThanOrEqual(53);
    }
  });

  it('puts every runner in exactly one duel each week', () => {
    for (const week of result.weeks) {
      const ids = week.duels.flatMap((d) => d.sides.map((s) => s.runnerId)).sort();
      expect(ids).toEqual(fiveRunners.runners.map((r) => r.id).sort());
    }
  });
});
