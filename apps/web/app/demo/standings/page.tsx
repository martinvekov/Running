import type { Metadata } from 'next';
import { fixture, result, runnerName } from '../_lib/data';
import { Label, Masthead, StandingsTable, WeekTabs } from '../_lib/ui';

export const metadata: Metadata = { title: 'Standings · Crew Seasons' };

const SCORING = [
  ['Show up', '5 per run, up to 4'],
  ['Keep your word', '15, or 8 if close'],
  ['Ambition', 'Up to +3'],
  ['Duel', 'Win 10 · draw 5'],
  ['Bounty', '5'],
];

export default function DemoStandingsPage() {
  const [leader, second] = result.standings;
  const finished = result.weeks.every((w) => w.status === 'closed');

  return (
    <main className="page with-tabbar">
      <Masthead
        kicker={fixture.crewName}
        title="Standings"
        meta={
          leader && second
            ? `${runnerName(leader.runnerId)} ${finished ? 'wins' : 'leads'} by ${leader.points - second.points} points`
            : undefined
        }
      />
      <WeekTabs active="season" weeks={result.weeks.length} />
      <StandingsTable rows={result.standings} title="Season 1" />

      <section className="section">
        <div className="section-head">
          <Label>Scoring</Label>
          <Label className="dim">Per week · max 53</Label>
        </div>
        <dl className="kv">
          {SCORING.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="note">
          Commit to your runs and km by Sunday 23:59. Everyone is scored against their own baseline,
          so pace never counts. Running beyond your word earns nothing.
        </p>
      </section>
    </main>
  );
}
