import type { Metadata } from 'next';
import { fixture, result, runnerName } from '../_lib/data';
import { HowItWorks, Masthead, PointsByRule, StandingsTable, WeekTabs } from '../_lib/ui';

export const metadata: Metadata = { title: 'Standings · Crew Seasons' };

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

      <PointsByRule />
      <HowItWorks open />
    </main>
  );
}
