import type { Metadata } from 'next';
import Link from 'next/link';
import { result, runnerName } from '../_lib/data';
import { Avatar, PageTitle, StandingsList, WeekTabs } from '../_lib/ui';

export const metadata: Metadata = { title: 'Leaderboard · Demo season · Crew Seasons' };

export default function DemoStandingsPage() {
  const [leader, second] = result.standings;
  const finished = result.weeks.every((w) => w.status === 'closed');

  return (
    <main className="page with-tabbar">
      <PageTitle title="Leaderboard" chip="Demo" sub="Season 1 · three weeks" />

      {leader && (
        <Link href={`/demo/runner/${leader.runnerId}`} className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{finished ? 'Season winner' : 'Leading'}</p>
            <p className="hero-name display">{runnerName(leader.runnerId)}</p>
            <p className="hero-points">{leader.points} points</p>
            {second && (
              <p className="muted small">
                {leader.points - second.points} ahead of {runnerName(second.runnerId)}
              </p>
            )}
          </div>
          <Avatar id={leader.runnerId} size={88} />
        </Link>
      )}

      <WeekTabs active="season" weeks={result.weeks.length} />
      <StandingsList rows={result.standings} caption="Season standings" />

      <section className="card">
        <h2 className="card-title">How points work</h2>
        <ul className="rules">
          <li>
            <span>Show up</span>
            <span>5 per run · max 4</span>
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
    </main>
  );
}
