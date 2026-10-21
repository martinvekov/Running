import {
  scoreSeason,
  type EffectiveCommitment,
  type RunView,
  type StandingRow,
} from '@crew/engine';
import { fixture, result } from './data';

// Builds the demo crew feed from engine output. Points and standings all come from the engine;
// this file only orders events and compares engine results before and after each run.

export interface RunContext {
  run: RunView;
  runnerId: string;
  weekIndex: number;
  loggedAt: string;
  commitment: EffectiveCommitment;
  /** % of committed km before and after this run (qualifying runs only). */
  pctBefore: number;
  pctAfter: number;
  /** This run took the runner past 100% of their committed km. */
  completedCommitment: boolean;
  /** Which counted run of the week this was (1-based), if it counted as a run. */
  runNumber?: number;
}

export type FeedItem =
  | { kind: 'run'; id: string; at: string; ctx: RunContext }
  | {
      kind: 'commit';
      id: string;
      at: string;
      runnerId: string;
      weekIndex: number;
      km: number;
      runs: number;
    }
  | {
      kind: 'overtake';
      id: string;
      at: string;
      runnerId: string;
      passed: string[];
      rank: number;
      activityId: string;
    }
  | { kind: 'week'; id: string; at: string; weekIndex: number };

const activityById = new Map(fixture.activities.map((a) => [a.id, a]));

function buildRunContexts(): Map<string, RunContext> {
  const out = new Map<string, RunContext>();
  for (const week of result.weeks) {
    for (const rw of week.runners) {
      let km = 0;
      let counted = 0;
      for (const run of rw.runs) {
        const qualifies = run.status === 'counted' || run.status === 'km-only';
        const before = (km / rw.commitment.km) * 100;
        if (qualifies) km += run.distanceM / 1000;
        if (run.status === 'counted') counted += 1;
        const after = (km / rw.commitment.km) * 100;
        out.set(run.activityId, {
          run,
          runnerId: rw.runnerId,
          weekIndex: week.weekIndex,
          loggedAt: activityById.get(run.activityId)!.loggedAt,
          commitment: rw.commitment,
          pctBefore: before,
          pctAfter: after,
          completedCommitment: before < 100 && after >= 99.9999,
          ...(run.status === 'counted' ? { runNumber: counted } : {}),
        });
      }
    }
  }
  return out;
}

export const runContexts = buildRunContexts();

function standingsAt(asOfMs: number): StandingRow[] {
  return scoreSeason({ ...fixture, asOf: new Date(asOfMs).toISOString() }).standings;
}

function buildFeed(): FeedItem[] {
  const items: FeedItem[] = [];

  for (const ctx of runContexts.values()) {
    items.push({ kind: 'run', id: `run-${ctx.run.activityId}`, at: ctx.loggedAt, ctx });
  }

  for (const week of result.weeks) {
    for (const rw of week.runners) {
      if (rw.commitment.source !== 'set') continue;
      const made = fixture.commitments
        .filter(
          (c) =>
            c.runnerId === rw.runnerId &&
            c.weekIndex === week.weekIndex &&
            c.km === rw.commitment.km &&
            c.runs === rw.commitment.runs &&
            c.committedAt <= week.commitDeadline,
        )
        .sort((a, b) => b.committedAt.localeCompare(a.committedAt))[0];
      if (made) {
        items.push({
          kind: 'commit',
          id: `commit-${rw.runnerId}-${week.weekIndex}`,
          at: made.committedAt,
          runnerId: rw.runnerId,
          weekIndex: week.weekIndex,
          km: made.km,
          runs: made.runs,
        });
      }
    }
    if (week.status === 'closed') {
      items.push({
        kind: 'week',
        id: `week-${week.weekIndex}`,
        at: week.closesAt,
        weekIndex: week.weekIndex,
      });
    }
  }

  // Overtakes: compare the engine's standings just before and just after each qualifying run.
  for (const ctx of runContexts.values()) {
    if (ctx.run.status !== 'counted' && ctx.run.status !== 'km-only') continue;
    const at = Date.parse(ctx.loggedAt);
    const before = standingsAt(at - 1);
    const after = standingsAt(at);
    const rankOf = (rows: StandingRow[], id: string) => rows.find((r) => r.runnerId === id)!.rank;
    const myBefore = rankOf(before, ctx.runnerId);
    const myAfter = rankOf(after, ctx.runnerId);
    const passed = after
      .filter((r) => r.runnerId !== ctx.runnerId)
      .filter((r) => rankOf(before, r.runnerId) <= myBefore && r.rank > myAfter)
      .map((r) => r.runnerId);
    if (passed.length) {
      items.push({
        kind: 'overtake',
        id: `overtake-${ctx.run.activityId}`,
        // A moment after the run itself so it sits above the run in the feed.
        at: new Date(at + 1).toISOString(),
        runnerId: ctx.runnerId,
        passed,
        rank: myAfter,
        activityId: ctx.run.activityId,
      });
    }
  }

  return items.sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

export const feed = buildFeed();

/** Km per day (Mon–Sun) for one runner's week, from qualifying runs. */
export function weekDays(runnerId: string, weekIndex: number): { date: string; km: number }[] {
  const week = result.weeks[weekIndex]!;
  const rw = week.runners.find((r) => r.runnerId === runnerId)!;
  const start = Date.parse(`${week.startDate}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    const km = rw.runs
      .filter((r) => r.runDate === date && (r.status === 'counted' || r.status === 'km-only'))
      .reduce((s, r) => s + r.distanceM / 1000, 0);
    return { date, km };
  });
}
