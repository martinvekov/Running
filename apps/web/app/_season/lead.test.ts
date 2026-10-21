import { describe, expect, it } from 'vitest';
import { fiveRunners } from '@crew/engine/fixtures';
import { leadLine } from './lead';
import { buildSeasonView } from './view';

const view = (standings: { runnerId: string; points: number }[]) => {
  const v = buildSeasonView(fiveRunners, { base: '/c/x', crewName: 'T' });
  return {
    ...v,
    result: {
      ...v.result,
      standings: standings.map((s, i) => ({ ...v.result.standings[0]!, ...s, rank: i + 1 })),
    },
  };
};
const [a, b, c] = fiveRunners.runners.map((r) => r.id) as [string, string, string];

describe('leadLine', () => {
  it('says who leads and by how much', () => {
    const l = leadLine(
      view([
        { runnerId: a, points: 12 },
        { runnerId: b, points: 9 },
      ]),
      false,
    );
    expect(l).toEqual({ name: fiveRunners.runners[0]!.name, text: 'leads by 3 points' });
  });

  it('says the season was won once it has finished', () => {
    const l = leadLine(
      view([
        { runnerId: a, points: 12 },
        { runnerId: b, points: 9 },
      ]),
      true,
    );
    expect(l?.text).toBe('won the season by 3 points');
  });

  it('does not claim a lead when the top places are level', () => {
    const l = leadLine(
      view([
        { runnerId: a, points: 5 },
        { runnerId: b, points: 5 },
        { runnerId: c, points: 5 },
      ]),
      false,
    );
    expect(l).toEqual({ text: 'Level on 5 points' });
  });

  it('says so when only some of the crew are level at the top', () => {
    const l = leadLine(
      view([
        { runnerId: a, points: 8 },
        { runnerId: b, points: 8 },
        { runnerId: c, points: 2 },
      ]),
      false,
    );
    expect(l?.text).toBe('2 runners are level on 8 points');
  });

  it('says nothing has been scored before anyone has points', () => {
    const l = leadLine(
      view([
        { runnerId: a, points: 0 },
        { runnerId: b, points: 0 },
      ]),
      false,
    );
    expect(l).toEqual({ text: 'Nothing scored yet' });
  });

  it('has nothing to say with fewer than two runners', () => {
    expect(leadLine(view([{ runnerId: a, points: 1 }]), false)).toBeNull();
  });
});
