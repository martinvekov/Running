import type { Metadata } from 'next';
import Link from 'next/link';
import { fixture, result, runnerName } from './_lib/data';
import { formatShortDate } from './_lib/format';
import { Avatar, DemoHeader, StandingsList, WeekTabs } from './_lib/ui';

export const metadata: Metadata = {
  title: 'Demo season · Crew Seasons',
  description: 'Five fictional runners, one three-week season, scored by the real engine.',
};

export default function DemoSeasonPage() {
  const [leader, second] = result.standings;
  const first = result.weeks[0]!;
  const last = result.weeks.at(-1)!;
  const finished = result.weeks.every((w) => w.status === 'closed');

  return (
    <main className="page">
      <DemoHeader
        subtitle={`${fixture.crewName} · Season 1 · ${formatShortDate(first.startDate)} – ${formatShortDate(last.endDate)}`}
      />

      {leader && (
        <Link href={`/demo/runner/${leader.runnerId}`} className="hero card">
          <Avatar id={leader.runnerId} size={56} />
          <div>
            <p className="eyebrow">{finished ? 'Season winner' : 'Leading'}</p>
            <p className="hero-name">{runnerName(leader.runnerId)}</p>
            <p className="muted">
              {leader.points} pts
              {second
                ? ` · ${leader.points - second.points} ahead of ${runnerName(second.runnerId)}`
                : ''}
            </p>
          </div>
          <span className="trophy" aria-hidden>
            🏆
          </span>
        </Link>
      )}

      <WeekTabs active="season" weeks={result.weeks.length} />
      <StandingsList rows={result.standings} caption="Season standings" />

      <section className="card">
        <h2 className="card-title">How points work</h2>
        <ul className="rules">
          <li>
            <span>Show up</span>
            <span>5 per run, max 4</span>
          </li>
          <li>
            <span>Keep your word</span>
            <span>15 or 8</span>
          </li>
          <li>
            <span>Ambition</span>
            <span>up to +3</span>
          </li>
          <li>
            <span>Duel</span>
            <span>win 10 · draw 5</span>
          </li>
          <li>
            <span>Bounty</span>
            <span>5</span>
          </li>
        </ul>
        <p className="muted small">
          Commit to your runs and km by Sunday 23:59. You&apos;re scored against your own baseline,
          so pace never matters and anyone can win. Running beyond your word earns nothing.
        </p>
      </section>

      <p className="footnote">
        Fictional runners. Every point comes from the same engine the real app will use. Tap a
        runner to see their runs and why they scored what they did.
      </p>
    </main>
  );
}
