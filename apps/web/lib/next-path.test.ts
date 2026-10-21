import { describe, expect, it } from 'vitest';
import { safeNext } from './next-path';

describe('safeNext', () => {
  it('keeps a same-site path, with its query', () => {
    expect(safeNext('/c/123')).toBe('/c/123');
    expect(safeNext('/join/abc?x=1')).toBe('/join/abc?x=1');
  });

  it('falls back for anything that could leave the site', () => {
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext('javascript:alert(1)')).toBe('/');
    expect(safeNext('/ok\r\nSet-Cookie: x=1')).toBe('/');
  });

  it('falls back when nothing is given', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
    expect(safeNext(null, '/welcome')).toBe('/welcome');
  });
});
