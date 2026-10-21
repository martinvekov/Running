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
import { Bar, Label, Monogram, ordinal } from '../../_lib/ui';

export function generateStaticParams() {
  return fixture.runners.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${runnersById.get(id)?.name ?? 'Runner'} · Crew Seasons` };
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
  const counted = weeks
    .flatMap(({ rw }) => rw.runs)
    .filter((r) => r.status === 'counted' || r.status === 'km-only');
  const totalKm = counted.reduce((s, r) => s + r.distanceM, 0) / 1000;
  const totalS = counted.reduce((s, r) => s + r.durationS, 0);

  return (
    <main className="page with-tabbar">
      <Link href="/demo/standings" className="back">
        ← Standings
      </Link>

      <header className="profile">
        <Monogram id={id} size={64} />
        <div className="profile-main">
          <h1>{runner.name}</h1>
          <p>{runner.persona}</p>
          <p className="profile-sub">
            Usual week {runner.baselineKm} km · {runner.baselineRuns} runs
          </p>
        </div>
        <div className="profile-score">
          <strong>{standing.points}</strong>
          <span>{ordinal(standing.rank)}</span>
        </div>
      </header>

      <dl className="stat-strip">
        <div>
          <dt>Km</dt>
          <dd>{totalKm.toFixed(1)}</dd>
        </div>
        <div>
          <dt>Runs</dt>
          <dd>{counted.length}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>{formatPace(totalS, totalKm * 1000).replace(' /km', '')}</dd>
        </div>
        <div>
          <dt>Duels</dt>
          <dd>{standing.duelWins}</dd>
        </div>
      </dl>

      {weeks.map(({ week, rw }) => (
        <section key={week.weekIndex} className="section">
          <div className="section-head">
            <Label>
              Week {week.weekIndex + 1} · {formatShortDate(week.startDate)} –{' '}
              {formatShortDate(week.endDate)}
            </Label>
            <span className="section-num">{rw.points}</span>
          </div>

          <div className="commit-line">
            <div className="spread">
              <Label className="dim">
                Committed {rw.commitment.runs} runs · {formatKm(rw.commitment.km)}
                {rw.commitment.source === 'carried-over'
                  ? ' · carried over'
                  : rw.commitment.source === 'baseline'
                    ? ' · baseline'
                    : ''}
              </Label>
              <Label className={rw.kmPct >= 100 ? 'tick' : 'dim'}>{Math.round(rw.kmPct)}%</Label>
            </div>
            <Bar pct={rw.kmPct} />
          </div>

          <ul className="breakdown">
            {rw.lines.map((line) => (
              <li key={line.rule}>
                <div>
                  <span className="breakdown-rule">{RULE_LABELS[line.rule]}</span>
                  <p>{line.reason}</p>
                </div>
                <span className={line.points ? 'breakdown-pts' : 'breakdown-pts zero'}>
                  {line.points ? `+${line.points}` : '0'}
                </span>
              </li>
            ))}
          </ul>

          {rw.runs.length > 0 && (
            <ul className="run-list">
              {rw.runs.map((run) => {
                const status = RUN_STATUS[run.status]!;
                return (
                  <li key={run.activityId}>
                    <Link href={`/demo/run/${run.activityId}`} className="run-row">
                      <Label className="dim run-day">{formatDay(run.runDate)}</Label>
                      <span className="run-km">{(run.distanceM / 1000).toFixed(2)}</span>
                      <Label className="dim">
                        {formatDuration(run.durationS)} ·{' '}
                        {formatPace(run.durationS, run.distanceM).replace(' /km', '')}
                      </Label>
                      <Label className={status.tone === 'warn' ? 'warn' : 'dim'}>
                        {run.bountyClaimed ? 'Bounty' : status.tone === 'ok' ? '' : status.label}
                      </Label>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
