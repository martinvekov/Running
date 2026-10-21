import type { Rules } from './rules';
import type { Runner } from './types';

export interface CommitmentBands {
  minKm: number;
  maxKm: number;
  minRuns: number;
  maxRuns: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function commitmentBands(rules: Rules, runner: Runner): CommitmentBands {
  const b = rules.commitmentBand;
  return {
    minKm: round1((runner.baselineKm * b.minKmPct) / 100),
    maxKm: round1((runner.baselineKm * b.maxKmPct) / 100),
    minRuns: Math.max(b.minRuns, runner.baselineRuns - b.runsBelow),
    maxRuns: runner.baselineRuns + b.runsAbove,
  };
}

export function validateCommitment(
  rules: Rules,
  runner: Runner,
  commitment: { km: number; runs: number },
): { ok: boolean; errors: string[] } {
  const bands = commitmentBands(rules, runner);
  const errors: string[] = [];
  if (!(commitment.km >= bands.minKm && commitment.km <= bands.maxKm)) {
    errors.push(`Commit between ${bands.minKm} and ${bands.maxKm} km.`);
  }
  if (
    !Number.isInteger(commitment.runs) ||
    commitment.runs < bands.minRuns ||
    commitment.runs > bands.maxRuns
  ) {
    errors.push(`Commit between ${bands.minRuns} and ${bands.maxRuns} runs.`);
  }
  return { ok: errors.length === 0, errors };
}
