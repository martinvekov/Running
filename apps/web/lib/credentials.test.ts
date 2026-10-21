import { describe, expect, it } from 'vitest';
import { cleanEmail, cleanPassword } from './credentials';

describe('cleanEmail', () => {
  it('trims and lowercases a plausible address', () => {
    expect(cleanEmail('  Martin.V@Example.COM ')).toBe('martin.v@example.com');
  });

  it('rejects things that are not an address', () => {
    expect(cleanEmail('')).toBeNull();
    expect(cleanEmail('no-at-sign')).toBeNull();
    expect(cleanEmail('a@b')).toBeNull();
    expect(cleanEmail('two@@example.com')).toBeNull();
    expect(cleanEmail('spa ce@example.com')).toBeNull();
    expect(cleanEmail(null)).toBeNull();
    expect(cleanEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
  });
});

describe('cleanPassword', () => {
  it('accepts 8 to 72 characters and leaves them untouched', () => {
    expect(cleanPassword('  pass word 1 ')).toBe('  pass word 1 ');
    expect(cleanPassword('x'.repeat(8))).toBe('x'.repeat(8));
    expect(cleanPassword('x'.repeat(72))).toBe('x'.repeat(72));
  });

  it('rejects too short, too long and non-text', () => {
    expect(cleanPassword('x'.repeat(7))).toBeNull();
    expect(cleanPassword('x'.repeat(73))).toBeNull();
    expect(cleanPassword(undefined)).toBeNull();
    expect(cleanPassword(12345678)).toBeNull();
  });
});
