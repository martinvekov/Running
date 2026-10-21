import type { Runner, SeasonInput } from '../src/types';
import fiveRunnersJson from './five-runners.json';

/** A season input with display extras, as stored in fixture files. */
export interface Fixture extends SeasonInput {
  crewName: string;
  runners: (Runner & { persona?: string })[];
}

export const fiveRunners = fiveRunnersJson as unknown as Fixture;
