import { fiveRunners } from '@crew/engine/fixtures';
import { buildSeasonView } from './view';

// The demo season: the simulator's fixture, scored by the engine once per server process.
export const demoView = buildSeasonView(fiveRunners, {
  base: '/demo',
  crewName: fiveRunners.crewName,
  demo: true,
  runners: fiveRunners.runners,
});
