import { describe, expect, it } from 'vitest';
import { commitmentBands, validateCommitment } from './commitment';
import { rulesV1 } from './rules';
import { runner } from './test-helpers';

describe('commitment bands', () => {
  const r = runner('a', 20, 3);

  it('allows 80–130% of baseline km and one fewer to two more runs', () => {
    expect(commitmentBands(rulesV1, r)).toEqual({ minKm: 16, maxKm: 26, minRuns: 2, maxRuns: 5 });
  });

  it('never allows fewer than one run', () => {
    expect(commitmentBands(rulesV1, runner('b', 5, 1)).minRuns).toBe(1);
  });

  it('accepts the edges of both bands', () => {
    expect(validateCommitment(rulesV1, r, { km: 16, runs: 2 }).ok).toBe(true);
    expect(validateCommitment(rulesV1, r, { km: 26, runs: 5 }).ok).toBe(true);
  });

  it('rejects km or runs outside the bands, with a reason for each', () => {
    const low = validateCommitment(rulesV1, r, { km: 15.9, runs: 1 });
    expect(low.ok).toBe(false);
    expect(low.errors).toHaveLength(2);
    expect(validateCommitment(rulesV1, r, { km: 26.1, runs: 3 }).ok).toBe(false);
    expect(validateCommitment(rulesV1, r, { km: 20, runs: 6 }).ok).toBe(false);
  });
});
