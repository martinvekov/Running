import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { result, runnerName } from '../../_lib/data';
import { formatDay, formatKm, formatShortDate } from '../../_lib/format';
import { Avatar, PageTitle, Progress, StandingsList, WeekTabs } from '../../_lib/ui';

export function generateStaticParams() {
  return result.weeks.map((w) => ({ week: String(w.weekIndex + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  return { title: `Week ${week} · Demo season · Crew Seasons` };
}

export default async function DemoWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekParam } = await params;
  const week = result.weeks[Number(weekParam) - 1];
  if (!week) notFound();

  const runners = [...week.runners].sort((a, b) => b.points - a.points);

  return (
    <main className="page with-tabbar">
      <PageTitle
        title={`Week ${week.weekIndex + 1}`}
        chip={week.status === 'closed' ? 'Final' : week.status === 'open' ? 'Live' : 'Soon'}
        sub={`${formatShortDate(week.startDate)} – ${formatShortDate(week.endDate)} · duels, bounty and scores`}
      />
      <WeekTabs active={week.weekIndex + 1} weeks={result.weeks.length} />

      {week.bounty && (
        <section className="card bounty">
          <div>
            <p className="eyebrow">Bounty · 5 points</p>
            <p className="bounty-title">{week.bounty}</p>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Duels</h2>
        <div className="duels">
          {week.duels.map((duel, i) => (
            <div key={i} className="duel">
              {duel.sides.map((side) => (
                <Link
                  key={side.runnerId}
                  href={`/demo/runner/${side.runnerId}`}
                  className="duel-side"
                >
                  <Avatar id={side.runnerId} size={32} />
                  <div className="duel-body">
                    <div className="duel-row">
                      <strong>{runnerName(side.runnerId)}</strong>
                      <span className={`pill ${side.outcome}`}>
                        {side.outcome === 'none' ? '–' : `+${side.points}`}
                      </span>
                    </div>
                    <Progress pct={side.kmPct} />
                    <small className="muted">
                      {side.completedOn
                        ? `Hit 100% on ${formatDay(side.completedOn)}`
                        : `${Math.round(side.kmPct)}% of committed km`}
                    </small>
                  </div>
                </Link>
              ))}
              <p className="duel-summary">{duel.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Week scores</h2>
        <ul className="week-scores">
          {runners.map((rw) => (
            <li key={rw.runnerId}>
              <Link href={`/demo/runner/${rw.runnerId}`} className="week-score">
                <Avatar id={rw.runnerId} size={32} />
                <div className="week-score-body">
                  <div className="duel-row">
                    <strong>{runnerName(rw.runnerId)}</strong>
                    <span className="points small-points display">
                      {rw.points}
                      <small>pts</small>
                    </span>
                  </div>
                  <Progress pct={rw.kmPct} />
                  <small className="muted">
                    {rw.runDays}/{rw.commitment.runs} runs · {formatKm(rw.km)} of{' '}
                    {formatKm(rw.commitment.km)}
                    {rw.commitment.source === 'carried-over' ? ' · commitment carried over' : ''}
                  </small>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <StandingsList rows={week.standings} caption="Season standings after this week" />
    </main>
  );
}
