import { describe, expect, it } from 'vitest';
import { getRules, maxWeeklyPoints, rulesV1 } from './index';

describe('rules', () => {
  it('v1 allows at most 53 points a week', () => {
    expect(maxWeeklyPoints(rulesV1)).toBe(53);
  });

  it('looks rules up by version and rejects unknown versions', () => {
    expect(getRules('v1')).toBe(rulesV1);
    expect(() => getRules('v0')).toThrow(/rules version/);
  });
});
