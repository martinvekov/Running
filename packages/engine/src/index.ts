// Pure scoring engine. No I/O, no clocks, no randomness: see CLAUDE.md rule 2.

export { scoreSeason } from './score';
export { commitmentBands, validateCommitment, type CommitmentBands } from './commitment';
export { duelGroups } from './pairings';
export { getRules, RULES_VERSIONS, rulesV1, type Rules } from './rules';
export { addDays, londonDate, londonInstant } from './time';
export type * from './types';

/** Week boundaries are computed in this time zone (CLAUDE.md rule 7). */
export const WEEK_TIME_ZONE = 'Europe/London';
