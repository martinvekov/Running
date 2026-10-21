// Deterministic round-robin duel pairings, seeded by the season id.

/** FNV-1a: a stable 32-bit hash, so the shuffle depends only on the season id. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: a small seeded generator. Same seed, same sequence. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(ids: string[], seasonId: string): string[] {
  const out = [...ids].sort();
  const next = seeded(hash(seasonId));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Duel groups for one week: pairs, plus one trio when the crew is odd.
 * Uses the circle method, so with n runners nobody repeats an opponent for n - 1 weeks
 * (n even) or n weeks (n odd).
 */
export function duelGroups(seasonId: string, runnerIds: string[], weekIndex: number): string[][] {
  const order = shuffled(runnerIds, seasonId);
  if (order.length <= 2) return order.length ? [order] : [];

  const BYE = '\u0000bye';
  const slots = order.length % 2 ? [...order, BYE] : order;
  const n = slots.length;
  const rounds = n - 1;
  const round = weekIndex % rounds;

  // Fix slot 0, rotate the rest by `round`.
  const rest = slots.slice(1);
  const rotated = [
    slots[0]!,
    ...rest.slice(rest.length - round),
    ...rest.slice(0, rest.length - round),
  ];

  const groups: string[][] = [];
  let byeRunner: string | undefined;
  for (let i = 0; i < n / 2; i++) {
    const a = rotated[i]!;
    const b = rotated[n - 1 - i]!;
    if (a === BYE) byeRunner = b;
    else if (b === BYE) byeRunner = a;
    else groups.push([a, b]);
  }
  if (byeRunner) groups[0] = [...groups[0]!, byeRunner];
  return groups;
}
