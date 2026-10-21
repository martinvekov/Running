import { validateCommitment } from './commitment';
import { duelGroups } from './pairings';
import { getRules, type Rules } from './rules';
import { addDays, endOfMinute, isMonday, londonInstant, toMs } from './time';
import type {
  Activity,
  BreakdownLine,
  Commitment,
  Duel,
  DuelSide,
  EffectiveCommitment,
  LocalDate,
  Runner,
  RunnerWeek,
  RunView,
  SeasonInput,
  SeasonResult,
  StandingRow,
  WeekResult,
  WeekStatus,
} from './types';

// Floating-point slack for percentage thresholds, so 95% of 20 km is reached by 19.000 km.
const EPS = 1e-9;

const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const fmtKm = (km: number) => `${Math.round(km * 10) / 10} km`;
const fmtPct = (pct: number) => `${Math.round(pct)}%`;

interface WeekFrame {
  weekIndex: number;
  startDate: LocalDate;
  endDate: LocalDate;
  commitDeadlineMs: number;
  closesAtMs: number;
}

function deadline(rules: Rules, date: LocalDate, time: string): number {
  return toMs(endOfMinute(londonInstant(date, time)));
}

function weekFrames(rules: Rules, startDate: LocalDate): WeekFrame[] {
  return Array.from({ length: rules.seasonWeeks }, (_, weekIndex) => {
    const start = addDays(startDate, weekIndex * 7);
    return {
      weekIndex,
      startDate: start,
      endDate: addDays(start, 6),
      commitDeadlineMs: deadline(
        rules,
        addDays(start, -rules.commitDeadline.daysBeforeWeekStart),
        rules.commitDeadline.time,
      ),
      closesAtMs: deadline(
        rules,
        addDays(start, rules.weekClose.daysAfterWeekStart),
        rules.weekClose.time,
      ),
    };
  });
}

function effectiveCommitments(
  rules: Rules,
  runner: Runner,
  frames: WeekFrame[],
  commitments: Commitment[],
): EffectiveCommitment[] {
  const out: EffectiveCommitment[] = [];
  for (const frame of frames) {
    const valid = commitments
      .filter(
        (c) =>
          c.weekIndex === frame.weekIndex &&
          toMs(c.committedAt) <= frame.commitDeadlineMs &&
          validateCommitment(rules, runner, c).ok,
      )
      .sort((a, b) => toMs(b.committedAt) - toMs(a.committedAt) || b.km - a.km || b.runs - a.runs);
    const chosen = valid[0];
    const previous = out[frame.weekIndex - 1];
    if (chosen) out.push({ km: chosen.km, runs: chosen.runs, source: 'set' });
    else if (previous) out.push({ km: previous.km, runs: previous.runs, source: 'carried-over' });
    else out.push({ km: runner.baselineKm, runs: runner.baselineRuns, source: 'baseline' });
  }
  return out;
}

interface RunnerWeekWork extends RunnerWeek {
  qualifying: Activity[];
  completedOn?: LocalDate;
  wordKept: boolean;
}

function scoreRunnerWeek(
  rules: Rules,
  runner: Runner,
  frame: WeekFrame,
  commitment: EffectiveCommitment,
  activities: Activity[],
  bounty: string | undefined,
): RunnerWeekWork {
  const q = rules.qualifyingRun;
  const runs: RunView[] = [];
  const qualifying: Activity[] = [];
  const countedDays = new Set<LocalDate>();

  for (const a of activities) {
    const longEnough = a.durationS >= q.minDurationS || a.distanceM >= q.minDistanceM;
    const logBy = Math.min(
      deadline(rules, addDays(a.runDate, q.logWindowDays), '23:59'),
      frame.closesAtMs,
    );
    const onTime = toMs(a.loggedAt) <= logBy;
    let status: RunView['status'];
    if (!longEnough) status = 'too-short';
    else if (!onTime) status = 'logged-late';
    else if (countedDays.has(a.runDate)) status = 'km-only';
    else status = 'counted';
    if (status === 'counted') countedDays.add(a.runDate);
    if (status === 'counted' || status === 'km-only') qualifying.push(a);
    runs.push({
      activityId: a.id,
      source: a.source,
      runDate: a.runDate,
      distanceM: a.distanceM,
      durationS: a.durationS,
      ...(a.linkUrl ? { linkUrl: a.linkUrl } : {}),
      bountyClaimed: a.bountyClaimed === true,
      status,
    });
  }

  const km = qualifying.reduce((sum, a) => sum + a.distanceM, 0) / 1000;
  const runDays = countedDays.size;
  const kmPct = (km / commitment.km) * 100;

  // The run date on which cumulative km first reached the commitment.
  let completedOn: LocalDate | undefined;
  let cumulative = 0;
  for (const a of qualifying) {
    cumulative += a.distanceM / 1000;
    if (cumulative + EPS >= commitment.km) {
      completedOn = a.runDate;
      break;
    }
  }

  const lines: BreakdownLine[] = [];

  const showUpRuns = Math.min(runDays, rules.showUp.maxRuns);
  lines.push({
    rule: 'show-up',
    points: showUpRuns * rules.showUp.pointsPerRun,
    reason:
      runDays === 0
        ? 'No qualifying runs this week.'
        : `${plural(runDays, 'run')} counted` +
          (runDays > rules.showUp.maxRuns ? ` (points cap at ${rules.showUp.maxRuns}).` : '.'),
  });

  const runsShort = Math.max(0, commitment.runs - runDays);
  const tier = rules.keepWord.find((t) => kmPct + EPS >= t.minKmPct && runsShort <= t.maxRunsShort);
  const target = `${plural(commitment.runs, 'run')}, ${fmtKm(commitment.km)}`;
  const did = `${plural(runDays, 'run')}, ${fmtKm(km)} (${fmtPct(kmPct)})`;
  lines.push({
    rule: 'keep-word',
    points: tier?.points ?? 0,
    reason: tier
      ? `Committed to ${target}; did ${did}.`
      : `Committed to ${target}; did ${did}. ${missed(rules, kmPct, runsShort)}`,
  });

  const abovePct = (commitment.km / runner.baselineKm - 1) * 100;
  const steps = Math.max(0, Math.floor(abovePct / rules.ambition.stepPct + EPS));
  const ambitionPoints = tier
    ? Math.min(rules.ambition.maxPoints, steps * rules.ambition.pointsPerStep)
    : 0;
  lines.push({
    rule: 'ambition',
    points: ambitionPoints,
    reason:
      steps === 0
        ? 'Commitment not 10% or more above baseline.'
        : tier
          ? `Committed ${fmtPct(abovePct)} above baseline km.`
          : `Committed ${fmtPct(abovePct)} above baseline, but only counts when the word is kept.`,
  });

  const claimed = bounty !== undefined && qualifying.some((a) => a.bountyClaimed);
  lines.push({
    rule: 'bounty',
    points: claimed ? rules.bounty.points : 0,
    reason:
      bounty === undefined
        ? 'No bounty this week.'
        : claimed
          ? `Claimed "${bounty}".`
          : `Did not claim "${bounty}".`,
  });

  return {
    runnerId: runner.id,
    commitment,
    km,
    runDays,
    kmPct,
    points: 0, // set once the duel line is added
    lines,
    runs,
    qualifying,
    ...(completedOn ? { completedOn } : {}),
    wordKept: tier?.points === rules.keepWord[0]?.points,
  };
}

/** Why no keep-your-word tier was reached, naming only the thresholds actually missed. */
function missed(rules: Rules, kmPct: number, runsShort: number): string {
  const lowest = rules.keepWord.at(-1)!;
  const needs: string[] = [];
  if (kmPct + EPS < lowest.minKmPct) needs.push(`${lowest.minKmPct}% of the km`);
  if (runsShort > lowest.maxRunsShort) {
    needs.push(
      lowest.maxRunsShort === 0
        ? 'every run'
        : `at most ${plural(lowest.maxRunsShort, 'run')} short`,
    );
  }
  return `Needed ${needs.join(' and ')}.`;
}

/** 1 if a beats b, -1 if b beats a, 0 for a draw. */
function compareDuel(rules: Rules, a: RunnerWeekWork, b: RunnerWeekWork): number {
  if (a.completedOn && b.completedOn) return -byString(a.completedOn, b.completedOn);
  if (a.completedOn) return 1;
  if (b.completedOn) return -1;
  const gap = a.kmPct - b.kmPct;
  if (Math.abs(gap) < rules.duel.drawGapPct - EPS) return 0;
  return gap > 0 ? 1 : -1;
}

function scoreDuel(
  rules: Rules,
  group: RunnerWeekWork[],
  names: Map<string, string>,
  started: boolean,
): Duel {
  if (!started) {
    return {
      sides: group.map((me) => ({ runnerId: me.runnerId, kmPct: 0, points: 0, outcome: 'none' })),
      summary: 'Not started.',
    };
  }
  const value = (r: number) => (r > 0 ? rules.duel.win : r < 0 ? rules.duel.loss : rules.duel.draw);
  const sides: DuelSide[] = group.map((me) => {
    const results = group.filter((o) => o !== me).map((o) => compareDuel(rules, me, o));
    const points = Math.ceil(results.reduce((s, r) => s + value(r), 0) / results.length);
    const outcome = points > rules.duel.draw ? 'win' : points < rules.duel.draw ? 'loss' : 'draw';
    return {
      runnerId: me.runnerId,
      kmPct: me.kmPct,
      ...(me.completedOn ? { completedOn: me.completedOn } : {}),
      points,
      outcome,
    };
  });
  const top = Math.max(...sides.map((s) => s.points));
  const leaders = sides
    .filter((s) => s.points === top)
    .map((s) => names.get(s.runnerId) ?? s.runnerId);
  const summary =
    leaders.length === sides.length
      ? 'Draw.'
      : leaders.length === 1
        ? `${leaders[0]} wins.`
        : `${leaders.join(' and ')} tie for first.`;
  return { sides, summary };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2026-11-08 → "Sun 8 Nov". */
function fmtDay(date: LocalDate): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

function duelReason(
  rules: Rules,
  me: RunnerWeekWork,
  side: DuelSide,
  opponents: RunnerWeekWork[],
  names: Map<string, string>,
): string {
  const name = (id: string) => names.get(id) ?? id;
  if (side.outcome === 'none') {
    return `Duel vs ${opponents.map((o) => name(o.runnerId)).join(' and ')} starts Monday.`;
  }
  const text = opponents
    .map((o) => {
      const r = compareDuel(rules, me, o);
      return `${r > 0 ? 'beat' : r < 0 ? 'lost to' : 'drew with'} ${name(o.runnerId)}`;
    })
    .join(', ');
  const how = side.completedOn
    ? `hit 100% on ${fmtDay(side.completedOn)}`
    : `reached ${fmtPct(side.kmPct)}`;
  const trio = opponents.length > 1 ? ' (trio: average of both duels, rounded up)' : '';
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}${trio}; ${how}.`;
}

interface Tally {
  runnerId: string;
  points: number;
  duelWins: number;
  weeksWordKept: number;
  lastRunDate?: LocalDate;
}

function rankTallies(tallies: Tally[], previous?: StandingRow[]): StandingRow[] {
  const cmp = (a: Tally, b: Tally) =>
    b.points - a.points ||
    b.duelWins - a.duelWins ||
    b.weeksWordKept - a.weeksWordKept ||
    // Earlier final run wins; no runs at all loses.
    (a.lastRunDate && b.lastRunDate
      ? byString(a.lastRunDate, b.lastRunDate)
      : a.lastRunDate
        ? -1
        : b.lastRunDate
          ? 1
          : 0);
  const sorted = [...tallies].sort((a, b) => cmp(a, b) || byString(a.runnerId, b.runnerId));
  const prevRank = new Map(previous?.map((r) => [r.runnerId, r.rank]));
  let rank = 0;
  return sorted.map((t, i) => {
    if (i === 0 || cmp(sorted[i - 1]!, t) !== 0) rank = i + 1;
    const before = prevRank.get(t.runnerId);
    return {
      rank,
      runnerId: t.runnerId,
      points: t.points,
      duelWins: t.duelWins,
      weeksWordKept: t.weeksWordKept,
      ...(t.lastRunDate ? { lastRunDate: t.lastRunDate } : {}),
      movement: before === undefined ? 0 : before - rank,
    };
  });
}

/**
 * Scores a season. Pure and deterministic: the same input, in any order, gives the same output.
 * Runs logged after `asOf` are ignored, so any past moment can be recomputed.
 */
export function scoreSeason(input: SeasonInput): SeasonResult {
  const rules = getRules(input.season.rulesVersion);
  if (!isMonday(input.season.startDate)) {
    throw new Error(`Season must start on a Monday, got ${input.season.startDate}`);
  }
  const asOfMs = toMs(input.asOf);
  const frames = weekFrames(rules, input.season.startDate);
  const runners = [...input.runners].sort((a, b) => byString(a.id, b.id));
  const names = new Map(runners.map((r) => [r.id, r.name]));
  const runnerIds = runners.map((r) => r.id);

  const activities = input.activities
    .filter((a) => toMs(a.loggedAt) <= asOfMs)
    .sort(
      (a, b) =>
        byString(a.runDate, b.runDate) ||
        toMs(a.loggedAt) - toMs(b.loggedAt) ||
        byString(a.id, b.id),
    );

  const commitmentsByRunner = new Map(
    runners.map((r) => [
      r.id,
      effectiveCommitments(
        rules,
        r,
        frames,
        input.commitments.filter((c) => c.runnerId === r.id),
      ),
    ]),
  );

  const tallies = new Map<string, Tally>(
    runnerIds.map((id) => [id, { runnerId: id, points: 0, duelWins: 0, weeksWordKept: 0 }]),
  );
  let previousStandings: StandingRow[] | undefined;
  const weeks: WeekResult[] = [];

  for (const frame of frames) {
    const status: WeekStatus =
      asOfMs > frame.closesAtMs
        ? 'closed'
        : asOfMs >= toMs(londonInstant(frame.startDate, '00:00'))
          ? 'open'
          : 'upcoming';
    const bounty = [...input.bounties]
      .filter((b) => b.weekIndex === frame.weekIndex)
      .sort((a, b) => byString(a.title, b.title))[0]?.title;

    const work = runners.map((r) =>
      scoreRunnerWeek(
        rules,
        r,
        frame,
        commitmentsByRunner.get(r.id)![frame.weekIndex]!,
        activities.filter(
          (a) => a.runnerId === r.id && a.runDate >= frame.startDate && a.runDate <= frame.endDate,
        ),
        bounty,
      ),
    );
    const workById = new Map(work.map((w) => [w.runnerId, w]));

    const duels: Duel[] = [];
    for (const group of duelGroups(input.season.id, runnerIds, frame.weekIndex)) {
      if (group.length < 2) {
        for (const id of group) {
          workById
            .get(id)!
            .lines.push({ rule: 'duel', points: 0, reason: 'No crew mate to duel.' });
        }
        continue;
      }
      const duel = scoreDuel(
        rules,
        group.map((id) => workById.get(id)!),
        names,
        status !== 'upcoming',
      );
      duels.push(duel);
      for (const side of duel.sides) {
        workById.get(side.runnerId)!.lines.push({
          rule: 'duel',
          points: side.points,
          reason: duelReason(
            rules,
            workById.get(side.runnerId)!,
            side,
            group.filter((id) => id !== side.runnerId).map((id) => workById.get(id)!),
            names,
          ),
        });
      }
    }
    const order: string[] = ['show-up', 'keep-word', 'ambition', 'duel', 'bounty'];
    const runnerWeeks: RunnerWeek[] = work.map((w) => {
      const lines = [...w.lines].sort((a, b) => order.indexOf(a.rule) - order.indexOf(b.rule));
      const points = lines.reduce((s, l) => s + l.points, 0);
      const t = tallies.get(w.runnerId)!;
      t.points += points;
      if (w.wordKept) t.weeksWordKept += 1;
      const lastCounted = w.qualifying.at(-1)?.runDate;
      if (lastCounted) t.lastRunDate = lastCounted;
      return {
        runnerId: w.runnerId,
        commitment: w.commitment,
        km: Math.round(w.km * 1000) / 1000,
        runDays: w.runDays,
        kmPct: Math.round(w.kmPct * 10) / 10,
        points,
        lines,
        runs: w.runs,
      };
    });
    for (const duel of duels) {
      for (const side of duel.sides) {
        if (side.outcome === 'win') tallies.get(side.runnerId)!.duelWins += 1;
      }
    }

    const standings = rankTallies([...tallies.values()], previousStandings);
    previousStandings = standings;
    weeks.push({
      weekIndex: frame.weekIndex,
      startDate: frame.startDate,
      endDate: frame.endDate,
      commitDeadline: new Date(frame.commitDeadlineMs).toISOString(),
      closesAt: new Date(frame.closesAtMs).toISOString(),
      status,
      ...(bounty ? { bounty } : {}),
      duels,
      runners: runnerWeeks,
      standings,
    });
  }

  return {
    seasonId: input.season.id,
    rulesVersion: rules.version,
    weeks,
    standings: previousStandings ?? [],
  };
}
