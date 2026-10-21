/** How many gradient tones the brand palette has. See the `tone-N` classes in globals.css. */
export const TONES = 5;

/** A stable tone for a person, so their avatar and run cards always share one gradient. */
export function toneOf(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++)
    h = Math.imul(h ^ name.toLowerCase().charCodeAt(i), 16777619);
  return (h >>> 0) % TONES;
}

/** The tone for each member of a crew: the first five get five different gradients. */
export function toneIn(order: string[], id: string): number {
  const i = order.indexOf(id);
  return i >= 0 ? i % TONES : toneOf(id);
}
