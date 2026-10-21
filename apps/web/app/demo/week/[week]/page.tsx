import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fixture, result, runnerName } from '../../_lib/data';
import { formatDay, formatKm, formatShortDate } from '../../_lib/format';
import { Bar, Label, Masthead, Monogram, StandingsTable, WeekTabs } from '../../_lib/ui';

export function generateStaticParams() {
  return result.weeks.map((w) => ({ week: String(w.weekIndex + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  return { title: `Week ${week} · Crew Seasons` };
}

export default async function DemoWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekParam } = await params;
  const week = result.weeks[Number(weekParam) - 1];
  if (!week) notFound();

  const runners = [...week.runners].sort((a, b) => b.points - a.points);
  const topRunner = runners[0];
  const status =
    week.status === 'closed' ? 'Final' : week.status === 'open' ? 'In progress' : 'Upcoming';

  return (
    <main className="page with-tabbar">
      <Masthead
        kicker={fixture.crewName}
        title={`Week ${week.weekIndex + 1}`}
        meta={
          topRunner && week.status !== 'upcoming'
            ? `${runnerName(topRunner.runnerId)} ${week.status === 'closed' ? 'won the week' : 'leads the week'} with ${topRunner.points} points · ${formatShortDate(week.startDate)} – ${formatShortDate(week.endDate)}`
            : `${formatShortDate(week.startDate)} – ${formatShortDate(week.endDate)} · ${status}`
        }
      />
      <WeekTabs active={week.weekIndex + 1} weeks={result.weeks.length} />

      {week.bounty && (
        <section className="section">
          <div className="section-head">
            <Label>Bounty</Label>
            <Label className="dim">5 pts</Label>
          </div>
          <p className="statement">{week.bounty}</p>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <Label>Duels</Label>
          <Label className="dim">First to 100% wins</Label>
        </div>
        {week.duels.map((duel, i) => (
          <div key={i} className="duel">
            {duel.sides.map((side) => (
              <Link key={side.runnerId} href={`/demo/runner/${side.runnerId}`} className="duel-row">
                <Monogram id={side.runnerId} size={28} />
                <div className="duel-main">
                  <div className="spread">
                    <span className="duel-name">{runnerName(side.runnerId)}</span>
                    <span className={`duel-pts ${side.outcome}`}>
                      {side.outcome === 'none' ? '–' : `+${side.points}`}
                    </span>
                  </div>
                  <Bar pct={side.kmPct} />
                  <Label className="dim">
                    {side.completedOn
                      ? `100% on ${formatDay(side.completedOn)}`
                      : `${Math.round(side.kmPct)}% of commitment`}
                  </Label>
                </div>
              </Link>
            ))}
            {duel.sides.length === 3 && (
              <p className="caption">
                Three-way duel: each runner is scored against both others and gets the average.
              </p>
            )}
            <Label className="duel-result">{duel.summary.replace(/\.$/, '')}</Label>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="section-head">
          <Label>Week points</Label>
          <Label className="dim">Pts</Label>
        </div>
        <ol className="table">
          {runners.map((rw, i) => (
            <li key={rw.runnerId}>
              <Link href={`/demo/runner/${rw.runnerId}`} className="row">
                <span className="row-rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="row-name">
                  {runnerName(rw.runnerId)}
                  <Label className="dim">
                    {rw.runDays}/{rw.commitment.runs} runs · {formatKm(rw.km)} of{' '}
                    {formatKm(rw.commitment.km)}
                  </Label>
                </span>
                <span className="row-num">{rw.points}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <StandingsTable rows={week.standings} title="Season after this week" />
    </main>
  );
}
