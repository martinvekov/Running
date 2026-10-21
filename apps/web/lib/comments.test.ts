import { describe, expect, it } from 'vitest';
import { cleanComment, MAX_COMMENT_LENGTH, timeAgo } from './comments';

describe('cleanComment', () => {
  it('keeps a normal comment and trims it', () => {
    expect(cleanComment('  Strong run!  ')).toBe('Strong run!');
  });
  it('rejects empty and blank comments and non-text', () => {
    expect(cleanComment('')).toBeNull();
    expect(cleanComment('   \n ')).toBeNull();
    expect(cleanComment(undefined)).toBeNull();
    expect(cleanComment(42)).toBeNull();
  });
  it('rejects a comment over the limit, accepts one at the limit', () => {
    expect(cleanComment('x'.repeat(MAX_COMMENT_LENGTH))).not.toBeNull();
    expect(cleanComment('x'.repeat(MAX_COMMENT_LENGTH + 1))).toBeNull();
  });
  it('removes control characters and collapses runs of blank lines and spaces', () => {
    expect(cleanComment('a\u0000b\u0007c')).toBe('abc');
    expect(cleanComment('a   b')).toBe('a b');
    expect(cleanComment('a\n\n\n\nb')).toBe('a\n\nb');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  it('shows short relative times', () => {
    expect(timeAgo('2026-11-10T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-11-10T11:55:00Z', now)).toBe('5m');
    expect(timeAgo('2026-11-10T09:00:00Z', now)).toBe('3h');
    expect(timeAgo('2026-11-08T12:00:00Z', now)).toBe('2d');
  });
  it('shows a date after a week', () => {
    expect(timeAgo('2026-10-30T12:00:00Z', now)).toBe('30 Oct');
  });
  it('never shows a negative time for a clock slightly ahead', () => {
    expect(timeAgo('2026-11-10T12:00:05Z', now)).toBe('just now');
  });
});
