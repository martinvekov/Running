import {
  scoreSeason,
  type ActivitySource,
  type Runner,
  type SeasonInput,
  type SeasonResult,
} from '@crew/engine';
import type { RunSocial } from '@/lib/social-data';
import { toneIn } from './tone';
import { buildFeedData, weekDays, type FeedItem, type RunContext } from './feed';

/** A runner as the screens see them. The demo crew has a one-line persona; real runners don't. */
export type ViewRunner = Runner & { persona?: string };

/** A logged run that falls outside the season's three weeks. It is shown but never scored. */
export interface OutsideRun {
  id: string;
  runnerId: string;
  source: ActivitySource;
  runDate: string;
  durationS: number;
  distanceM: number;
  loggedAt: string;
  linkUrl?: string;
}

/**
 * One season, scored and ready to show. Every screen reads from this, so the demo crew and a
 * real crew share the same pages. Points always come from the engine.
 */
export interface SeasonView {
  /** URL prefix for links, e.g. /demo or /c/<crew id>. */
  base: string;
  crewName: string;
  /** Demo seasons show example kudos and a "Demo" chip. */
  demo: boolean;
  /** The crew's id, for forms that post back to it. Real crews only. */
  crewId?: string;
  /** The signed-in person, if any. */
  meId?: string;
  /** Likes and comments by run id. Empty for the demo. */
  social: Map<string, RunSocial>;
  /** Logged runs outside the season, newest first. */
  outsideRuns: OutsideRun[];
  seasonNumber: number;
  input: SeasonInput;
  result: SeasonResult;
  runners: ViewRunner[];
  runnersById: Map<string, ViewRunner>;
  runnerName: (id: string) => string;
  /** The gradient tone for a person, from their place in the crew. */
  toneOf: (id: string) => number;
  runContexts: Map<string, RunContext>;
  feed: FeedItem[];
  weekDays: (runnerId: string, weekIndex: number) => { date: string; km: number }[];
}

export function buildSeasonView(
  input: SeasonInput,
  options: {
    base: string;
    crewName: string;
    demo?: boolean;
    seasonNumber?: number;
    runners?: ViewRunner[];
    outsideRuns?: OutsideRun[];
    crewId?: string;
    meId?: string;
    social?: Record<string, RunSocial>;
    /** Names for crew mates who are not in the season. */
    otherNames?: Record<string, string>;
  },
): SeasonView {
  const result = scoreSeason(input);
  const runners: ViewRunner[] = options.runners ?? input.runners;
  const runnersById = new Map(runners.map((r) => [r.id, r]));
  const seasonIds = new Set(input.activities.map((a) => a.id));
  const outsideRuns = (options.outsideRuns ?? []).filter((r) => !seasonIds.has(r.id));
  const { runContexts, feed } = buildFeedData(input, result, outsideRuns);
  const otherNames = options.otherNames ?? {};
  // Everyone in the crew, season runners first, so tones stay put as the season changes.
  const crewOrder = [...runners.map((r) => r.id), ...Object.keys(otherNames)];
  return {
    base: options.base,
    crewName: options.crewName,
    demo: options.demo ?? false,
    ...(options.crewId ? { crewId: options.crewId } : {}),
    ...(options.meId ? { meId: options.meId } : {}),
    social: new Map(Object.entries(options.social ?? {})),
    outsideRuns,
    seasonNumber: options.seasonNumber ?? 1,
    input,
    result,
    runners,
    runnersById,
    runnerName: (id) => runnersById.get(id)?.name ?? otherNames[id] ?? 'Runner',
    toneOf: (id) => toneIn(crewOrder, id),
    runContexts,
    feed,
    weekDays: (runnerId, weekIndex) => weekDays(result, runnerId, weekIndex),
  };
}
