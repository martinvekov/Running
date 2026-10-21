import { describe, expect, it } from 'vitest';
import { duelGroups } from './pairings';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `r${i + 1}`);

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|');
}

describe('duel pairings', () => {
  it('pairs four runners so everyone meets each crew mate once in three weeks', () => {
    const seen = new Set<string>();
    for (let w = 0; w < 3; w++) {
      const groups = duelGroups('s1', ids(4), w);
      expect(groups).toHaveLength(2);
      for (const g of groups) {
        expect(g).toHaveLength(2);
        seen.add(pairKey(g[0]!, g[1]!));
      }
    }
    expect(seen.size).toBe(6);
  });

  it('never repeats a pair across a season with six runners', () => {
    const seen = new Set<string>();
    for (let w = 0; w < 3; w++) {
      for (const g of duelGroups('s1', ids(6), w)) seen.add(pairKey(g[0]!, g[1]!));
    }
    expect(seen.size).toBe(9);
  });

  it('puts every runner in exactly one group, with one trio in an odd crew', () => {
    for (let w = 0; w < 3; w++) {
      const groups = duelGroups('s1', ids(5), w);
      expect(groups.map((g) => g.length).sort()).toEqual([2, 3]);
      expect(groups.flat().sort()).toEqual(ids(5));
    }
  });

  it('handles crews of one, two and three', () => {
    expect(duelGroups('s1', ['a'], 0)).toEqual([['a']]);
    expect(duelGroups('s1', ['a', 'b'], 2).flat().sort()).toEqual(['a', 'b']);
    expect(duelGroups('s1', ['a', 'b', 'c'], 1)).toHaveLength(1);
  });

  it('is deterministic and ignores input order', () => {
    const a = duelGroups('s1', ids(6), 1);
    const b = duelGroups('s1', [...ids(6)].reverse(), 1);
    expect(b).toEqual(a);
  });

  it('shuffles differently for different seasons', () => {
    const first = JSON.stringify(duelGroups('season-a', ids(6), 0));
    const others = ['season-b', 'season-c', 'season-d', 'season-e'].map((s) =>
      JSON.stringify(duelGroups(s, ids(6), 0)),
    );
    expect(others.some((o) => o !== first)).toBe(true);
  });
});
