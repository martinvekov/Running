import { scoreSeason, type Runner, type SeasonInput, type SeasonResult } from '@crew/engine';
import { buildFeedData, weekDays, type FeedItem, type RunContext } from './feed';

/** A runner as the screens see them. The demo crew has a one-line persona; real runners don't. */
export type ViewRunner = Runner & { persona?: string };

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
  seasonNumber: number;
  input: SeasonInput;
  result: SeasonResult;
  runners: ViewRunner[];
  runnersById: Map<string, ViewRunner>;
  runnerName: (id: string) => string;
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
  },
): SeasonView {
  const result = scoreSeason(input);
  const runners: ViewRunner[] = options.runners ?? input.runners;
  const runnersById = new Map(runners.map((r) => [r.id, r]));
  const { runContexts, feed } = buildFeedData(input, result);
  return {
    base: options.base,
    crewName: options.crewName,
    demo: options.demo ?? false,
    seasonNumber: options.seasonNumber ?? 1,
    input,
    result,
    runners,
    runnersById,
    runnerName: (id) => runnersById.get(id)?.name ?? id,
    runContexts,
    feed,
    weekDays: (runnerId, weekIndex) => weekDays(result, runnerId, weekIndex),
  };
}
