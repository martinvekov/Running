export const REACTIONS = ['🔥', '👏', '💪'] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface DemoReactions {
  counts: Record<Reaction, number>;
  /** Crew mates who reacted, for "Alex +3". */
  by: string[];
}
