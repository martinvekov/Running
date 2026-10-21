import type { Metadata } from 'next';
import { fixture, result } from './_lib/data';
import { feed } from './_lib/feed';
import { formatShortDate } from './_lib/format';
import { CrewProgress, Feed, HowItWorks, Masthead, StandingsCard } from './_lib/ui';

export const metadata: Metadata = {
  title: 'Feed · Crew Seasons',
  description: 'Five fictional runners, one three-week season, scored by the real engine.',
};

export default function DemoFeedPage() {
  const first = result.weeks[0]!;
  const last = result.weeks.at(-1)!;
  return (
    <main className="page with-tabbar">
      <Masthead
        kicker={fixture.crewName}
        title="Feed"
        meta={`Season 1 · ${formatShortDate(first.startDate)} – ${formatShortDate(last.endDate)}`}
      />
      <StandingsCard />
      <HowItWorks />
      <CrewProgress />
      <Feed items={feed} />
    </main>
  );
}
