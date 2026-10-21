import { describe, expect, it } from 'vitest';
import { fiveRunners } from '@crew/engine/fixtures';
import { buildSeasonView, type OutsideRun } from './view';

const outside = (over: Partial<OutsideRun> = {}): OutsideRun => ({
  id: 'old-1',
  runnerId: fiveRunners.runners[0]!.id,
  source: 'strava',
  runDate: '2026-09-14',
  durationS: 1800,
  distanceM: 5000,
  loggedAt: '2026-09-14T08:00:00Z',
  ...over,
});

describe('runs outside the season', () => {
  const base = { base: '/c/x', crewName: 'Test' };

  it('appear in the feed as unscored runs without changing the standings', () => {
    const plain = buildSeasonView(fiveRunners, base);
    const withOld = buildSeasonView(fiveRunners, { ...base, outsideRuns: [outside()] });
    const past = withOld.feed.filter((i) => i.kind === 'past');
    expect(past).toHaveLength(1);
    expect(past[0]).toMatchObject({ id: 'past-old-1', runnerId: fiveRunners.runners[0]!.id });
    expect(withOld.result.standings).toEqual(plain.result.standings);
    expect(withOld.feed).toHaveLength(plain.feed.length + 1);
  });

  it('sit in time order among the other items', () => {
    const view = buildSeasonView(fiveRunners, {
      ...base,
      outsideRuns: [
        outside({ id: 'a', loggedAt: '2026-01-01T08:00:00Z' }),
        outside({ id: 'b', loggedAt: '2099-01-01T08:00:00Z' }),
      ],
    });
    expect(view.feed[0]).toMatchObject({ kind: 'past', id: 'past-b' });
    expect(view.feed.at(-1)).toMatchObject({ kind: 'past', id: 'past-a' });
  });

  it('use a crew mate who is not in the season by name', () => {
    const view = buildSeasonView(fiveRunners, {
      ...base,
      outsideRuns: [outside({ runnerId: 'late-joiner' })],
      otherNames: { 'late-joiner': 'Jo' },
    });
    expect(view.runnerName('late-joiner')).toBe('Jo');
    expect(view.runnerName('nobody')).toBe('Runner');
  });

  it('never repeat a run the season already shows', () => {
    const seasonRun = fiveRunners.activities[0]!;
    const view = buildSeasonView(fiveRunners, {
      ...base,
      outsideRuns: [outside({ id: seasonRun.id })],
    });
    expect(view.feed.filter((i) => i.kind === 'past')).toHaveLength(0);
  });
});
