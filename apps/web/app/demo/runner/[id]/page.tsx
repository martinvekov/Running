import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fixture, result, runnersById } from '../../_lib/data';
import {
  formatDay,
  formatDuration,
  formatKm,
  formatPace,
  formatShortDate,
  RULE_LABELS,
  RUN_STATUS,
} from '../../_lib/format';
import { Avatar, Progress } from '../../_lib/ui';

export function generateStaticParams() {
  return fixture.runners.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${runnersById.get(id)?.name ?? 'Runner'} · Demo season · Crew Seasons` };
}

export default async function DemoRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const runner = runnersById.get(id);
  const standing = result.standings.find((s) => s.runnerId === id);
  if (!runner || !standing) notFound();

  const weeks = result.weeks.map((w) => ({
    week: w,
    rw: w.runners.find((r) => r.runnerId === id)!,
  }));
  const allRuns = weeks.flatMap(({ rw }) => rw.runs);
  const counted = allRuns.filter((r) => r.status === 'counted' || r.status === 'km-only');
  const totalKm = counted.reduce((s, r) => s + r.distanceM, 0) / 1000;
  const totalS = counted.reduce((s, r) => s + r.durationS, 0);

  return (
    <main className="page with-tabbar">
      <Link href="/demo/standings" className="back">
        ← Leaderboard
      </Link>

      <header className="profile">
        <Avatar id={id} size={72} />
        <div>
          <h1 className="display">{runner.name}</h1>
          <p className="muted">{runner.persona}</p>
          <p className="muted small">
            Baseline {runner.baselineKm} km · {runner.baselineRuns} runs a week
          </p>
        </div>
        <div className="profile-points">
          <span className="rank-badge">#{standing.rank}</span>
          <strong className="display">{standing.points}</strong>
          <small>pts</small>
        </div>
      </header>

      <section className="stats display-stats">
        <div>
          <strong>{totalKm.toFixed(1)}</strong>
          <small>Season km</small>
        </div>
        <div>
          <strong>{counted.length}</strong>
          <small>Runs</small>
        </div>
        <div>
          <strong>{formatPace(totalS, totalKm * 1000).replace(' /km', '')}</strong>
          <small>Pace /km</small>
        </div>
        <div>
          <strong>{standing.duelWins}</strong>
          <small>Duel wins</small>
        </div>
      </section>

      {weeks.map(({ week, rw }) => (
        <section key={week.weekIndex} className="card">
          <div className="week-head">
            <h2 className="card-title">
              Week {week.weekIndex + 1}
              <small>
                {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
              </small>
            </h2>
            <span className="points display">
              {rw.points}
              <small>pts</small>
            </span>
          </div>

          <div className="commitment">
            <div className="duel-row">
              <span className="muted small">
                Committed {rw.commitment.runs} runs · {formatKm(rw.commitment.km)}
                {rw.commitment.source === 'carried-over'
                  ? ' (carried over)'
                  : rw.commitment.source === 'baseline'
                    ? ' (baseline)'
                    : ''}
              </span>
              <span className="small">{Math.round(rw.kmPct)}%</span>
            </div>
            <Progress pct={rw.kmPct} />
          </div>

          <ul className="lines">
            {rw.lines.map((line) => (
              <li key={line.rule}>
                <div>
                  <strong>{RULE_LABELS[line.rule]}</strong>
                  <p className="muted small">{line.reason}</p>
                </div>
                <span className={line.points ? 'line-pts' : 'line-pts zero'}>+{line.points}</span>
              </li>
            ))}
          </ul>

          {rw.runs.length > 0 ? (
            <ul className="runs">
              {rw.runs.map((run) => {
                const status = RUN_STATUS[run.status]!;
                return (
                  <li key={run.activityId}>
                    <Link href={`/demo/run/${run.activityId}`} className="run">
                      <div className="run-date">
                        <strong>{formatDay(run.runDate).split(' ')[0]}</strong>
                        <small>{formatShortDate(run.runDate)}</small>
                      </div>
                      <div className="run-main">
                        <strong>{formatKm(run.distanceM / 1000)}</strong>
                        <small className="muted">
                          {formatDuration(run.durationS)} ·{' '}
                          {formatPace(run.durationS, run.distanceM)}
                        </small>
                      </div>
                      <div className="run-tags">
                        <span className={`chip ${status.tone}`}>{status.label}</span>
                        <span className={`chip source ${run.source}`}>
                          {run.source === 'strava' ? 'Strava' : 'Manual'}
                        </span>
                        {run.bountyClaimed && <span className="chip bounty-chip">Bounty</span>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted small empty">No runs this week.</p>
          )}
        </section>
      ))}
    </main>
  );
}
