import { fixture } from './data';
import type { DemoReactions, Reaction } from './reactions';

// Demo-only reactions, generated deterministically so every build shows the same feed.
// Real reactions arrive with the social layer (milestone 5) as events.

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function demoReactions(itemId: string, authorId?: string): DemoReactions {
  const h = hash(itemId);
  const counts = {
    '🔥': h % 5,
    '👏': (h >>> 3) % 4,
    '💪': (h >>> 6) % 3,
  } as Record<Reaction, number>;
  const mates = fixture.runners.filter((r) => r.id !== authorId).map((r) => r.id);
  const total = counts['🔥'] + counts['👏'] + counts['💪'];
  const by = Array.from(
    { length: Math.min(total, mates.length) },
    (_, i) => mates[(h + i) % mates.length]!,
  );
  return { counts, by: [...new Set(by)] };
}
