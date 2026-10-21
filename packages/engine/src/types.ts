/** A calendar date in Europe/London, formatted YYYY-MM-DD. */
export type LocalDate = string;

/** An absolute instant, as an ISO 8601 string with an offset (e.g. 2026-11-02T07:30:00Z). */
export type Instant = string;

export type ActivitySource = 'manual' | 'strava';

export interface SeasonInfo {
  id: string;
  /** A Monday. The season runs for `rules.seasonWeeks` weeks from this date. */
  startDate: LocalDate;
  rulesVersion: string;
}

export interface Runner {
  id: string;
  name: string;
  /** Typical weekly km, frozen for the season. */
  baselineKm: number;
  /** Typical runs per week, frozen for the season. */
  baselineRuns: number;
}

/** A runner's promise for one week: runs and km. */
export interface Commitment {
  runnerId: string;
  weekIndex: number;
  km: number;
  runs: number;
  committedAt: Instant;
}

/** The canonical record for every run, whatever its source. */
export interface Activity {
  id: string;
  runnerId: string;
  source: ActivitySource;
  runDate: LocalDate;
  durationS: number;
  distanceM: number;
  /** When the run reached the app (manual entry or import). */
  loggedAt: Instant;
  linkUrl?: string;
  bountyClaimed?: boolean;
}

export interface Bounty {
  weekIndex: number;
  title: string;
}

export interface SeasonInput {
  season: SeasonInfo;
  runners: Runner[];
  commitments: Commitment[];
  activities: Activity[];
  bounties: Bounty[];
  /** The moment to score as of. Anything logged after it is ignored. */
  asOf: Instant;
}

export type RuleId = 'show-up' | 'keep-word' | 'ambition' | 'duel' | 'bounty';

export interface BreakdownLine {
  rule: RuleId;
  points: number;
  reason: string;
}

export type CommitmentSource = 'set' | 'carried-over' | 'baseline';

export interface EffectiveCommitment {
  km: number;
  runs: number;
  source: CommitmentSource;
}

export type RunStatus = 'counted' | 'km-only' | 'too-short' | 'logged-late';

export interface RunView {
  activityId: string;
  source: ActivitySource;
  runDate: LocalDate;
  distanceM: number;
  durationS: number;
  linkUrl?: string;
  bountyClaimed: boolean;
  status: RunStatus;
}

export interface RunnerWeek {
  runnerId: string;
  commitment: EffectiveCommitment;
  /** Km from qualifying runs. */
  km: number;
  /** Distinct days with a qualifying run. */
  runDays: number;
  /** km / committed km, as a percentage. */
  kmPct: number;
  points: number;
  lines: BreakdownLine[];
  runs: RunView[];
}

export type DuelOutcome = 'win' | 'draw' | 'loss' | 'none';

export interface DuelSide {
  runnerId: string;
  kmPct: number;
  /** Run date on which the runner reached 100% of committed km, if they did. */
  completedOn?: LocalDate;
  points: number;
  outcome: DuelOutcome;
}

export interface Duel {
  sides: DuelSide[];
  summary: string;
}

export type WeekStatus = 'upcoming' | 'open' | 'closed';

export interface StandingRow {
  rank: number;
  runnerId: string;
  points: number;
  duelWins: number;
  weeksWordKept: number;
  lastRunDate?: LocalDate;
  /** Places gained (positive) or lost (negative) since the previous week's standings. */
  movement: number;
}

export interface WeekResult {
  weekIndex: number;
  startDate: LocalDate;
  endDate: LocalDate;
  commitDeadline: Instant;
  closesAt: Instant;
  status: WeekStatus;
  bounty?: string;
  duels: Duel[];
  runners: RunnerWeek[];
  /** Season standings including this week. */
  standings: StandingRow[];
}

export interface SeasonResult {
  seasonId: string;
  rulesVersion: string;
  weeks: WeekResult[];
  /** Season standings as of `asOf`. */
  standings: StandingRow[];
}
