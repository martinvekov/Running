import { describe, expect, it } from 'vitest';
import { toneIn, toneOf, TONES } from './tone';

describe('toneOf', () => {
  it('is stable and ignores case', () => {
    expect(toneOf('Priya')).toBe(toneOf('Priya'));
    expect(toneOf('Priya')).toBe(toneOf('priya'));
  });
  it('stays inside the palette', () => {
    for (const n of ['A', 'Brian', 'Martin', 'Sam', 'Alex', 'x'.repeat(40), '']) {
      expect(toneOf(n)).toBeGreaterThanOrEqual(0);
      expect(toneOf(n)).toBeLessThan(TONES);
    }
  });
  it('uses more than one tone across a crew', () => {
    const tones = new Set(['Brian', 'Martin', 'Sam', 'Alex', 'Priya', 'Dan'].map(toneOf));
    expect(tones.size).toBeGreaterThan(1);
  });
});

describe('toneIn', () => {
  it('gives the first five people in a crew five different tones', () => {
    const crew = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(new Set(crew.slice(0, 5).map((id) => toneIn(crew, id))).size).toBe(5);
    expect(toneIn(crew, 'f')).toBe(0);
  });
  it('still gives someone outside the list a tone', () => {
    expect(toneIn(['a'], 'stranger')).toBeLessThan(TONES);
  });
});
