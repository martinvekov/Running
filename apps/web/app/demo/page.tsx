import type { Metadata } from 'next';
import { fixture, result } from './_lib/data';
import { feed } from './_lib/feed';
import { formatShortDate } from './_lib/format';
import { CrewRings, FeedList, PageTitle } from './_lib/ui';

export const metadata: Metadata = {
  title: 'Feed · Demo season · Crew Seasons',
  description: 'Five fictional runners, one three-week season, scored by the real engine.',
};

export default function DemoFeedPage() {
  const first = result.weeks[0]!;
  const last = result.weeks.at(-1)!;
  return (
    <main className="page with-tabbar">
      <PageTitle
        title="Crew feed"
        chip="Demo"
        sub={`${fixture.crewName} · Season 1 · ${formatShortDate(first.startDate)} – ${formatShortDate(last.endDate)}`}
      />
      <CrewRings />
      <FeedList items={feed} />
      <p className="footnote">
        Fictional runners and reactions. Every point comes from the same engine the real app will
        use.
      </p>
    </main>
  );
}
