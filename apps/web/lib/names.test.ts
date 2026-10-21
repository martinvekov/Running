import { describe, expect, it } from 'vitest';
import { cleanCrewName, cleanDisplayName, suggestDisplayName } from './names';

describe('cleanDisplayName', () => {
  it('trims and collapses spaces', () => {
    expect(cleanDisplayName('  Martin   V  ')).toBe('Martin V');
  });

  it('rejects empty, blank, too long and non-text names', () => {
    expect(cleanDisplayName('')).toBeNull();
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName('x'.repeat(41))).toBeNull();
    expect(cleanDisplayName(null)).toBeNull();
    expect(cleanDisplayName(42)).toBeNull();
  });

  it('accepts exactly 40 characters', () => {
    expect(cleanDisplayName('x'.repeat(40))).toBe('x'.repeat(40));
  });

  it('strips control characters', () => {
    expect(cleanDisplayName('Mar\u0000tin\n')).toBe('Martin');
  });
});

describe('suggestDisplayName', () => {
  it('uses the first name from Google', () => {
    expect(suggestDisplayName({ full_name: 'Priya Shah' }, 'p@example.com')).toBe('Priya');
    expect(suggestDisplayName({ name: 'Alex' })).toBe('Alex');
  });

  it('falls back to the email name, then to Runner', () => {
    expect(suggestDisplayName({}, 'jo.smith@example.com')).toBe('jo.smith');
    expect(suggestDisplayName({}, undefined)).toBe('Runner');
    expect(suggestDisplayName({ full_name: '   ' }, '')).toBe('Runner');
  });
});

describe('cleanCrewName', () => {
  it('allows up to 60 characters and tidies spaces', () => {
    expect(cleanCrewName('  Sunday   Club ')).toBe('Sunday Club');
    expect(cleanCrewName('x'.repeat(60))).toBe('x'.repeat(60));
    expect(cleanCrewName('x'.repeat(61))).toBeNull();
    expect(cleanCrewName('')).toBeNull();
    expect(cleanCrewName(undefined)).toBeNull();
  });
});
