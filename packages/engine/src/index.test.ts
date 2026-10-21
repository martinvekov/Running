import { describe, expect, it } from 'vitest';
import { WEEK_TIME_ZONE } from './index';

describe('engine package', () => {
  it('uses Europe/London for week boundaries', () => {
    expect(WEEK_TIME_ZONE).toBe('Europe/London');
  });
});
