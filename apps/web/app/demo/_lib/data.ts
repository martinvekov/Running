import { scoreSeason } from '@crew/engine';
import { fiveRunners } from '@crew/engine/fixtures';

// The demo season: the simulator's fixture, scored by the engine at build time.
export const fixture = fiveRunners;
export const result = scoreSeason(fixture);

export const runnersById = new Map(fixture.runners.map((r) => [r.id, r]));

export function runnerName(id: string): string {
  return runnersById.get(id)?.name ?? id;
}
