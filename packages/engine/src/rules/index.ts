import type { Rules } from './types';
import { rulesV1 } from './v1';

export type { Rules } from './types';
export { rulesV1 } from './v1';

const RULES: Record<string, Rules> = { [rulesV1.version]: rulesV1 };

export const RULES_VERSIONS = Object.keys(RULES);

export function getRules(version: string): Rules {
  const rules = RULES[version];
  if (!rules) throw new Error(`Unknown rules version: ${version}`);
  return rules;
}

/** The most a runner can score in one week under these rules. */
export function maxWeeklyPoints(rules: Rules): number {
  return (
    rules.showUp.pointsPerRun * rules.showUp.maxRuns +
    (rules.keepWord[0]?.points ?? 0) +
    rules.ambition.maxPoints +
    rules.duel.win +
    rules.bounty.points
  );
}
