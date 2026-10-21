import { describe, expect, it } from 'vitest';
import { lookBackWindow } from './lookback-window';

describe('lookBackWindow', () => {
  it('ends on the last finished Sunday and starts on a Monday', () => {
    // Wednesday 21 Oct 2026: this week began Monday 19 Oct.
    const w = lookBackWindow('2026-10-21');
    expect(w.lastSunday).toBe('2026-10-18');
    expect(w.firstStart).toBe('2026-05-04');
    expect(new Date(`${w.firstStart}T12:00:00Z`).getUTCDay()).toBe(1);
    expect(w.historyFrom).toBe('2026-04-06');
  });

  it('treats a Monday as the start of the new week', () => {
    expect(lookBackWindow('2026-10-19').lastSunday).toBe('2026-10-18');
  });

  it('treats a Sunday as part of the week that is still running', () => {
    expect(lookBackWindow('2026-10-18').lastSunday).toBe('2026-10-11');
  });

  it('covers eight blocks of 21 days', () => {
    const w = lookBackWindow('2026-10-21');
    const days =
      (Date.parse(`${w.lastSunday}T12:00:00Z`) - Date.parse(`${w.firstStart}T12:00:00Z`)) /
        86_400_000 +
      1;
    expect(days).toBe(8 * 21);
  });
});
