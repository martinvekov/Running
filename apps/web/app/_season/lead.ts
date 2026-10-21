import type { SeasonView } from './view';

/** Who leads and by how much, or that the top places are level. */
export function leadLine(
  view: SeasonView,
  finished: boolean,
): { name?: string; text: string } | null {
  const rows = view.result.standings;
  const [leader, second] = rows;
  if (!leader || !second) return null;
  if (leader.points === second.points) {
    const level = rows.filter((r) => r.points === leader.points).length;
    const all = level === rows.length;
    const points = `${leader.points} ${leader.points === 1 ? 'point' : 'points'}`;
    return {
      text:
        leader.points === 0
          ? 'Nothing scored yet'
          : all
            ? `${finished ? 'Finished' : 'Level'} on ${points}`
            : `${level} runners ${finished ? 'finished' : 'are'} level on ${points}`,
    };
  }
  return {
    name: view.runnerName(leader.runnerId),
    text: `${finished ? 'won the season' : 'leads'} by ${leader.points - second.points} points`,
  };
}
