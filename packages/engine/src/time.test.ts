import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, endOfMinute, isMonday, londonDate, londonInstant } from './time';

describe('Europe/London time helpers', () => {
  it('converts London wall-clock time to an instant across the October clock change', () => {
    // BST (UTC+1) ends on Sunday 25 October 2026.
    expect(londonInstant('2026-10-24', '23:59')).toBe('2026-10-24T22:59:00.000Z');
    expect(londonInstant('2026-10-26', '23:59')).toBe('2026-10-26T23:59:00.000Z');
    expect(londonInstant('2027-03-29', '12:00')).toBe('2027-03-29T11:00:00.000Z');
  });

  it('gives the London calendar date of an instant', () => {
    expect(londonDate('2026-07-05T23:30:00Z')).toBe('2026-07-06');
    expect(londonDate('2026-12-05T23:30:00Z')).toBe('2026-12-05');
  });

  it('includes the whole minute in a deadline', () => {
    expect(endOfMinute('2026-11-01T23:59:00.000Z')).toBe('2026-11-01T23:59:59.999Z');
  });

  it('does calendar arithmetic on local dates', () => {
    expect(addDays('2026-11-02', 6)).toBe('2026-11-08');
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysBetween('2026-11-02', '2026-11-09')).toBe(7);
    expect(isMonday('2026-11-02')).toBe(true);
    expect(isMonday('2026-11-03')).toBe(false);
  });
});
