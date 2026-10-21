import type { Runner } from '@crew/engine';
import type { DemoKudos } from './reactions';

// Demo-only kudos, generated deterministically so every build shows the same feed.
// Real reactions arrive with the social layer (milestone 5) as events.

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function demoKudos(runners: Runner[], itemId: string, authorId?: string): DemoKudos {
  const h = hash(itemId);
  const mates = runners.filter((r) => r.id !== authorId).map((r) => r.id);
  const count = h % (mates.length + 1);
  const by = Array.from({ length: count }, (_, i) => mates[(h + i) % mates.length]!);
  return { count, by };
}
