import { describe, expect, it } from 'vitest';
import { scoreSeason } from './score';
import { AFTER_SEASON, commit, run, runner, season } from './test-helpers';
import type { RuleId, SeasonInput, SeasonResult } from './types';

function week(result: SeasonResult, runnerId: string, w = 0) {
  const rw = result.weeks[w]!.runners.find((r) => r.runnerId === runnerId);
  if (!rw) throw new Error(`no week ${w} for ${runnerId}`);
  return rw;
}

function pts(result: SeasonResult, runnerId: string, rule: RuleId, w = 0) {
  return week(result, runnerId, w).lines.find((l) => l.rule === rule)?.points ?? 0;
}

/** One runner, baseline 20 km / 3 runs, committed to 20 km / 3 runs in week 0. */
function solo(partial: Partial<SeasonInput>) {
  return scoreSeason(
    season({ runners: [runner('a', 20, 3)], commitments: [commit('a', 0, 20, 3)], ...partial }),
  );
}

describe('show up', () => {
  it('scores 5 per qualifying run', () => {
    const r = solo({ activities: [run('a', '2026-11-02', 5), run('a', '2026-11-04', 5)] });
    expect(pts(r, 'a', 'show-up')).toBe(10);
  });

  it('caps at 4 runs', () => {
    const days = ['02', '03', '04', '05', '06', '07'].map((d) => run('a', `2026-11-${d}`, 4));
    expect(pts(solo({ activities: days }), 'a', 'show-up')).toBe(20);
  });

  it('counts one run per day, but counts both runs towards km', () => {
    const r = solo({ activities: [run('a', '2026-11-02', 5), run('a', '2026-11-02', 6)] });
    expect(pts(r, 'a', 'show-up')).toBe(5);
    expect(week(r, 'a').km).toBe(11);
    expect(week(r, 'a').runDays).toBe(1);
    expect(
      week(r, 'a')
        .runs.map((x) => x.status)
        .sort(),
    ).toEqual(['counted', 'km-only']);
  });
});

describe('qualifying runs', () => {
  it('needs at least 15 minutes or 2 km', () => {
    const r = solo({
      activities: [
        run('a', '2026-11-02', 1.9, { durationS: 14 * 60 }),
        run('a', '2026-11-03', 2, { durationS: 10 * 60 }),
        run('a', '2026-11-04', 1, { durationS: 15 * 60 }),
      ],
    });
    expect(pts(r, 'a', 'show-up')).toBe(10);
    expect(week(r, 'a').km).toBe(3);
    expect(week(r, 'a').runs.find((x) => x.runDate === '2026-11-02')?.status).toBe('too-short');
  });

  it('must be logged by 23:59 two days after the run date', () => {
    const r = solo({
      activities: [
        run('a', '2026-11-02', 5, { loggedAt: '2026-11-04T23:59:30Z' }),
        run('a', '2026-11-03', 5, { loggedAt: '2026-11-06T00:00:00Z' }),
      ],
    });
    expect(pts(r, 'a', 'show-up')).toBe(5);
    expect(week(r, 'a').runs.find((x) => x.runDate === '2026-11-03')?.status).toBe('logged-late');
  });

  it('must be logged before the week closes on Monday 12:00', () => {
    const r = solo({
      activities: [
        run('a', '2026-11-07', 5, { loggedAt: '2026-11-09T12:00:30Z' }),
        run('a', '2026-11-08', 5, { loggedAt: '2026-11-09T12:01:00Z' }),
      ],
    });
    expect(pts(r, 'a', 'show-up')).toBe(5);
  });

  it('ignores runs logged after the as-of moment', () => {
    const r = solo({
      activities: [run('a', '2026-11-02', 5, { loggedAt: '2026-11-03T09:00:00Z' })],
      asOf: '2026-11-03T08:00:00Z',
    });
    expect(week(r, 'a').runs).toHaveLength(0);
  });

  it('ignores runs outside the season', () => {
    const r = solo({ activities: [run('a', '2026-11-01', 5), run('a', '2026-11-23', 5)] });
    expect(r.weeks.flatMap((w) => w.runners.flatMap((x) => x.runs))).toHaveLength(0);
  });
});

describe('keep your word', () => {
  const three = (km: number) => [
    run('a', '2026-11-02', km / 3),
    run('a', '2026-11-04', km / 3),
    run('a', '2026-11-06', km / 3),
  ];

  it('scores 15 for every committed run and 95% of committed km', () => {
    expect(pts(solo({ activities: three(19.5) }), 'a', 'keep-word')).toBe(15);
    const exactly95 = [
      run('a', '2026-11-02', 6),
      run('a', '2026-11-04', 6),
      run('a', '2026-11-06', 7),
    ];
    expect(pts(solo({ activities: exactly95 }), 'a', 'keep-word')).toBe(15);
  });

  it('scores 8 at 75% of km', () => {
    expect(pts(solo({ activities: three(18.9) }), 'a', 'keep-word')).toBe(8);
    expect(pts(solo({ activities: three(15) }), 'a', 'keep-word')).toBe(8);
  });

  it('scores 8 when one run short, even with all the km', () => {
    const r = solo({ activities: [run('a', '2026-11-02', 10), run('a', '2026-11-04', 10)] });
    expect(pts(r, 'a', 'keep-word')).toBe(8);
  });

  it('scores 0 below 75% of km or two runs short', () => {
    expect(pts(solo({ activities: three(14.9) }), 'a', 'keep-word')).toBe(0);
    expect(pts(solo({ activities: [run('a', '2026-11-02', 20)] }), 'a', 'keep-word')).toBe(0);
  });

  it('gives nothing for going beyond the commitment', () => {
    const exact = solo({ activities: three(20) });
    const double = solo({ activities: three(40) });
    expect(week(double, 'a').points).toBe(week(exact, 'a').points);
  });
});

describe('ambition', () => {
  const kept = (km: number) =>
    scoreSeason(
      season({
        runners: [runner('a', 20, 3)],
        commitments: [commit('a', 0, km, 3)],
        activities: [
          run('a', '2026-11-02', km / 3),
          run('a', '2026-11-04', km / 3),
          run('a', '2026-11-06', km / 3),
        ],
      }),
    );

  it('adds 1 per full 10% above baseline km, up to 3', () => {
    expect(pts(kept(20), 'a', 'ambition')).toBe(0);
    expect(pts(kept(21.9), 'a', 'ambition')).toBe(0);
    expect(pts(kept(22), 'a', 'ambition')).toBe(1);
    expect(pts(kept(24), 'a', 'ambition')).toBe(2);
    expect(pts(kept(25.8), 'a', 'ambition')).toBe(2);
    expect(pts(kept(26), 'a', 'ambition')).toBe(3);
  });

  it('only counts in a week that earns keep-your-word points', () => {
    const r = scoreSeason(
      season({
        runners: [runner('a', 20, 3)],
        commitments: [commit('a', 0, 26, 3)],
        activities: [run('a', '2026-11-02', 5)],
      }),
    );
    expect(pts(r, 'a', 'ambition')).toBe(0);
  });

  it('matches the brief: a 130% commitment at 90% scores 8 + 3', () => {
    const r = scoreSeason(
      season({
        runners: [runner('a', 20, 3)],
        commitments: [commit('a', 0, 26, 3)],
        activities: [
          run('a', '2026-11-02', 7.8),
          run('a', '2026-11-04', 7.8),
          run('a', '2026-11-06', 7.8),
        ],
      }),
    );
    expect(pts(r, 'a', 'keep-word') + pts(r, 'a', 'ambition')).toBe(11);
  });
});

describe('commitments', () => {
  it('counts a commitment made by Sunday 23:59 before the week', () => {
    const r = solo({ commitments: [commit('a', 0, 24, 4, '2026-11-01T23:59:59Z')] });
    expect(week(r, 'a').commitment).toEqual({ km: 24, runs: 4, source: 'set' });
  });

  it('ignores a late commitment and falls back to the baseline in week one', () => {
    const r = solo({ commitments: [commit('a', 0, 24, 4, '2026-11-02T00:00:00Z')] });
    expect(week(r, 'a').commitment).toEqual({ km: 20, runs: 3, source: 'baseline' });
  });

  it('carries the previous week over when no commitment is made', () => {
    const r = solo({ commitments: [commit('a', 0, 24, 4)] });
    expect(week(r, 'a', 1).commitment).toEqual({ km: 24, runs: 4, source: 'carried-over' });
    expect(week(r, 'a', 2).commitment).toEqual({ km: 24, runs: 4, source: 'carried-over' });
  });

  it('ignores a commitment outside the bands', () => {
    const r = solo({ commitments: [commit('a', 0, 30, 3)] });
    expect(week(r, 'a').commitment.source).toBe('baseline');
  });

  it('uses the latest valid commitment made before the deadline', () => {
    const r = solo({
      commitments: [
        commit('a', 0, 22, 3, '2026-10-30T10:00:00Z'),
        commit('a', 0, 18, 2, '2026-11-01T10:00:00Z'),
      ],
    });
    expect(week(r, 'a').commitment).toEqual({ km: 18, runs: 2, source: 'set' });
  });
});

describe('bounty', () => {
  const bounties = [{ weekIndex: 0, title: 'Run before 7am' }];

  it('scores 5 once a week for a claim on a qualifying run', () => {
    const r = solo({
      bounties,
      activities: [
        run('a', '2026-11-02', 5, { bountyClaimed: true }),
        run('a', '2026-11-03', 5, { bountyClaimed: true }),
      ],
    });
    expect(pts(r, 'a', 'bounty')).toBe(5);
    expect(r.weeks[0]!.bounty).toBe('Run before 7am');
  });

  it('scores 0 for a claim on a run that does not qualify, or in a week without a bounty', () => {
    const short = solo({
      bounties,
      activities: [run('a', '2026-11-02', 1, { durationS: 300, bountyClaimed: true })],
    });
    expect(pts(short, 'a', 'bounty')).toBe(0);
    const none = solo({ activities: [run('a', '2026-11-02', 5, { bountyClaimed: true })] });
    expect(pts(none, 'a', 'bounty')).toBe(0);
  });
});

describe('duels', () => {
  /** Two runners, 20 km commitments. */
  function pair(activities: SeasonInput['activities']) {
    return scoreSeason(
      season({
        runners: [runner('a'), runner('b')],
        commitments: [commit('a', 0, 20, 3), commit('b', 0, 20, 3)],
        activities,
      }),
    );
  }

  it('gives the win to the first to reach 100% of committed km, by run date', () => {
    const r = pair([
      run('a', '2026-11-02', 10),
      run('a', '2026-11-04', 10),
      run('b', '2026-11-05', 20),
    ]);
    expect(pts(r, 'a', 'duel')).toBe(10);
    expect(pts(r, 'b', 'duel')).toBe(0);
  });

  it('is a draw when both reach 100% on the same date', () => {
    const r = pair([run('a', '2026-11-04', 20), run('b', '2026-11-04', 25)]);
    expect(pts(r, 'a', 'duel')).toBe(5);
    expect(pts(r, 'b', 'duel')).toBe(5);
  });

  it('beats any percentage when only one runner completes', () => {
    const r = pair([run('a', '2026-11-08', 20), run('b', '2026-11-02', 19)]);
    expect(pts(r, 'a', 'duel')).toBe(10);
  });

  it('gives the win to the higher percentage when neither completes', () => {
    const r = pair([run('a', '2026-11-02', 12), run('b', '2026-11-02', 10)]);
    expect(pts(r, 'a', 'duel')).toBe(10);
    expect(pts(r, 'b', 'duel')).toBe(0);
  });

  it('is a draw when neither completes and the gap is under 5 points', () => {
    const r = pair([run('a', '2026-11-02', 12), run('b', '2026-11-02', 11.1)]);
    expect(pts(r, 'a', 'duel')).toBe(5);
    expect(pts(r, 'b', 'duel')).toBe(5);
  });

  it('scores a trio as the average of two duels, rounded up', () => {
    const trio = (activities: SeasonInput['activities']) =>
      scoreSeason(
        season({
          runners: [runner('a'), runner('b'), runner('c')],
          commitments: ['a', 'b', 'c'].map((id) => commit(id, 0, 20, 3)),
          activities,
        }),
      );
    const clear = trio([
      run('a', '2026-11-02', 20),
      run('b', '2026-11-04', 20),
      run('c', '2026-11-02', 5),
    ]);
    expect(['a', 'b', 'c'].map((id) => pts(clear, id, 'duel'))).toEqual([10, 5, 0]);

    const allDraw = trio([]);
    expect(['a', 'b', 'c'].map((id) => pts(allDraw, id, 'duel'))).toEqual([5, 5, 5]);

    const mixed = trio([run('a', '2026-11-02', 20)]);
    expect(['a', 'b', 'c'].map((id) => pts(mixed, id, 'duel'))).toEqual([10, 3, 3]);
  });

  it('gives no duel points to a runner with no crew mate', () => {
    const r = solo({ activities: [run('a', '2026-11-02', 20)] });
    expect(pts(r, 'a', 'duel')).toBe(0);
    expect(r.weeks[0]!.duels).toHaveLength(0);
  });
});

describe('weekly maximum', () => {
  it('is 53', () => {
    const r = scoreSeason(
      season({
        runners: [runner('a', 20, 3), runner('b', 20, 3)],
        commitments: [commit('a', 0, 26, 4), commit('b', 0, 20, 3)],
        bounties: [{ weekIndex: 0, title: 'New route' }],
        activities: [
          run('a', '2026-11-02', 7, { bountyClaimed: true }),
          run('a', '2026-11-03', 7),
          run('a', '2026-11-04', 7),
          run('a', '2026-11-05', 7),
        ],
      }),
    );
    expect(week(r, 'a').points).toBe(53);
  });
});

describe('week status', () => {
  it('marks weeks upcoming, open or closed as of the given moment', () => {
    const r = solo({ asOf: '2026-11-09T12:00:00Z' });
    expect(r.weeks.map((w) => w.status)).toEqual(['open', 'open', 'upcoming']);
    const later = solo({ asOf: '2026-11-09T12:01:00Z' });
    expect(later.weeks.map((w) => w.status)).toEqual(['closed', 'open', 'upcoming']);
  });

  it('awards no points for a week that has not started', () => {
    const r = scoreSeason(
      season({ runners: [runner('a'), runner('b')], asOf: '2026-11-03T12:00:00Z' }),
    );
    expect(r.weeks[2]!.runners.every((x) => x.points === 0)).toBe(true);
    expect(r.weeks[2]!.duels[0]!.sides.every((s) => s.outcome === 'none')).toBe(true);
    expect(r.standings.every((s) => s.points === 5)).toBe(true);
  });

  it('exposes the deadlines in London time', () => {
    const r = solo({});
    expect(r.weeks[0]!.commitDeadline).toBe('2026-11-01T23:59:59.999Z');
    expect(r.weeks[0]!.closesAt).toBe('2026-11-09T12:00:59.999Z');
  });
});

describe('standings', () => {
  it('sums the weeks and ranks by points', () => {
    const r = scoreSeason(
      season({
        runners: [runner('a'), runner('b')],
        commitments: [commit('a', 0, 20, 3), commit('b', 0, 20, 3)],
        activities: [
          run('a', '2026-11-02', 5),
          run('b', '2026-11-02', 5),
          run('b', '2026-11-10', 5),
        ],
      }),
    );
    const total = (id: string) => r.weeks.reduce((s, w) => s + week(r, id, w.weekIndex).points, 0);
    expect(r.standings.map((s) => s.runnerId)).toEqual(['b', 'a']);
    expect(r.standings[0]!.points).toBe(total('b'));
  });

  it('breaks ties on duel wins, then weeks with the word kept, then the earlier final run', () => {
    // a and b draw every duel and score identically, except b's final run is later.
    const r = scoreSeason(
      season({
        runners: [runner('a'), runner('b')],
        commitments: [commit('a', 0, 20, 3), commit('b', 0, 20, 3)],
        activities: [run('a', '2026-11-03', 3), run('b', '2026-11-04', 3)],
      }),
    );
    expect(r.standings.map((s) => [s.runnerId, s.rank])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('shares a rank when everything is tied', () => {
    const r = scoreSeason(season({ runners: [runner('a'), runner('b')] }));
    expect(r.standings.map((s) => s.rank)).toEqual([1, 1]);
  });

  it('reports movement since the previous week', () => {
    const r = scoreSeason(
      season({
        runners: [runner('a'), runner('b'), runner('c'), runner('d')],
        activities: [
          run('a', '2026-11-02', 5),
          run('b', '2026-11-10', 5),
          run('b', '2026-11-11', 5),
          run('b', '2026-11-12', 5),
        ],
      }),
    );
    const b = r.weeks[1]!.standings.find((s) => s.runnerId === 'b')!;
    expect(b.movement).toBeGreaterThan(0);
    expect(r.weeks[0]!.standings.every((s) => s.movement === 0)).toBe(true);
  });
});

describe('determinism', () => {
  it('gives identical output for the same inputs in any order', () => {
    const input = season({
      runners: ['a', 'b', 'c', 'd', 'e'].map((id) => runner(id)),
      commitments: ['a', 'b', 'c', 'd', 'e'].map((id) => commit(id, 0, 18, 3)),
      bounties: [{ weekIndex: 1, title: 'Run with a crew mate' }],
      activities: [
        run('a', '2026-11-02', 6, { id: 'x1' }),
        run('b', '2026-11-03', 8, { id: 'x2' }),
        run('c', '2026-11-10', 4, { id: 'x3', bountyClaimed: true }),
        run('d', '2026-11-17', 10, { id: 'x4' }),
        run('e', '2026-11-18', 3, { id: 'x5' }),
        run('a', '2026-11-18', 3, { id: 'x6' }),
      ],
    });
    const reversed: SeasonInput = {
      ...input,
      runners: [...input.runners].reverse(),
      commitments: [...input.commitments].reverse(),
      activities: [...input.activities].reverse(),
      bounties: [...input.bounties].reverse(),
    };
    expect(scoreSeason(reversed)).toEqual(scoreSeason(input));
    expect(scoreSeason(input)).toEqual(scoreSeason(input));
  });
});

describe('input checks', () => {
  it('rejects an unknown rules version', () => {
    expect(() =>
      scoreSeason(season({ season: { id: 's', startDate: '2026-11-02', rulesVersion: 'v99' } })),
    ).toThrow(/rules version/);
  });

  it('rejects a season that does not start on a Monday', () => {
    expect(() =>
      scoreSeason(season({ season: { id: 's', startDate: '2026-11-03', rulesVersion: 'v1' } })),
    ).toThrow(/Monday/);
  });

  it('scores an empty season with every week present', () => {
    const r = scoreSeason(season({ runners: [runner('a')], asOf: AFTER_SEASON }));
    expect(r.weeks).toHaveLength(3);
    expect(r.standings[0]!.points).toBe(0);
  });
});
