import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Kudos } from './client';
import {
  formatDay,
  formatDuration,
  formatKm,
  formatPace,
  formatShortDate,
  RULE_LABELS,
  RUN_STATUS,
} from './format';
import type { RunContext } from './feed';
import { demoKudos } from './social';
import {
  Bar,
  CrewProgress,
  Feed,
  HowItWorks,
  Label,
  Masthead,
  Monogram,
  ordinal,
  PointsByRule,
  RunFigures,
  runPoints,
  StandingsCard,
  StandingsTable,
  WeekTabs,
} from './ui';
import { leadLine } from './lead';
import type { SeasonView } from './view';

export function FeedScreen({ view, earlier }: { view: SeasonView; earlier?: number }) {
  const first = view.result.weeks[0]!;
  const last = view.result.weeks.at(-1)!;
  return (
    <main className="page with-tabbar">
      <Masthead
        kicker={view.crewName}
        demo={view.demo}
        title="Feed"
        meta={`Season ${view.seasonNumber} · ${formatShortDate(first.startDate)} – ${formatShortDate(last.endDate)}`}
      />
      <StandingsCard view={view} />
      <HowItWorks />
      <CrewProgress view={view} />
      <Feed view={view} {...(earlier ? { earlier } : {})} />
    </main>
  );
}

export function StandingsScreen({ view }: { view: SeasonView }) {
  const { result } = view;
  const finished = result.weeks.every((w) => w.status === 'closed');
  const lead = leadLine(view, finished);
  return (
    <main className="page with-tabbar">
      <Masthead
        kicker={view.crewName}
        demo={view.demo}
        title="Standings"
        meta={lead ? `${lead.name ? `${lead.name} ` : ''}${lead.text}` : undefined}
      />
      <WeekTabs view={view} active="season" />
      <StandingsTable view={view} rows={result.standings} title={`Season ${view.seasonNumber}`} />
      <PointsByRule view={view} />
      <HowItWorks open />
    </main>
  );
}

function counted(ctx: RunContext): [string, string] {
  switch (ctx.run.status) {
    case 'too-short':
      return ['Not counted', 'Under 15 minutes and 2 km'];
    case 'logged-late':
      return ['Not counted', 'Logged after the window closed'];
    case 'km-only':
      return ['Km only', 'Second run that day'];
    case 'counted':
      return [
        'Counted',
        ctx.runNumber! <= ctx.commitment.runs
          ? `Run ${ctx.runNumber} of ${ctx.commitment.runs} committed`
          : `Run ${ctx.runNumber}, beyond the ${ctx.commitment.runs} committed`,
      ];
  }
}

export function RunScreen({ view, id }: { view: SeasonView; id: string }) {
  const { result, runnerName, runnersById, runContexts } = view;
  const ctx = runContexts.get(id);
  if (!ctx) notFound();

  const runner = runnersById.get(ctx.runnerId)!;
  const week = result.weeks[ctx.weekIndex]!;
  const rw = week.runners.find((r) => r.runnerId === ctx.runnerId)!;
  const duel = week.duels.find((d) => d.sides.some((s) => s.runnerId === ctx.runnerId));
  const mySide = duel?.sides.find((s) => s.runnerId === ctx.runnerId);
  const days = view.weekDays(ctx.runnerId, ctx.weekIndex);
  const maxKm = Math.max(...days.map((d) => d.km), 1);
  const qualifies = ctx.run.status === 'counted' || ctx.run.status === 'km-only';
  const kudos = demoKudos(view.runners, `run-${id}`, ctx.runnerId);
  const [statusTitle, statusDetail] = counted(ctx);

  return (
    <main className="page with-tabbar">
      <div className="spread">
        <Link href={view.base} className="back">
          ← Feed
        </Link>
      </div>

      <header className="run-head">
        <Link href={`${view.base}/runner/${runner.id}`} className="item-head">
          <Monogram name={runner.name} size={36} />
          <span className="item-who">
            {runner.name}
            <small>
              Week {ctx.weekIndex + 1} · {formatDay(ctx.run.runDate)}
            </small>
          </span>
        </Link>
        <RunFigures ctx={ctx} size="hero" />
        {view.demo && <Kudos initial={kudos} names={kudos.by.map(runnerName)} />}
      </header>

      <section className="section">
        <div className="section-head">
          <Label>Counted for</Label>
          <Label className={qualifies ? 'tick' : 'warn'}>{statusTitle}</Label>
        </div>
        <dl className="kv">
          <div>
            <dt>Status</dt>
            <dd>{statusDetail}</dd>
          </div>
          <div>
            <dt>Points</dt>
            <dd>{runPoints(ctx) > 0 ? `+${runPoints(ctx)} show-up` : '0, no show-up points'}</dd>
          </div>
          {qualifies && (
            <div>
              <dt>Commitment</dt>
              <dd>
                {Math.round(ctx.pctBefore)}% → {Math.round(ctx.pctAfter)}% of{' '}
                {formatKm(rw.commitment.km)}
              </dd>
            </div>
          )}
          {ctx.completedCommitment && mySide?.completedOn && (
            <div>
              <dt>Duel</dt>
              <dd>Finish set on {formatDay(mySide.completedOn)}</dd>
            </div>
          )}
          {ctx.run.bountyClaimed && (
            <div>
              <dt>Bounty</dt>
              <dd>{week.bounty}</dd>
            </div>
          )}
        </dl>
        {qualifies && <Bar pct={ctx.pctAfter} from={ctx.pctBefore} />}
      </section>

      <section className="section">
        <div className="section-head">
          <Label>Week {ctx.weekIndex + 1}</Label>
          <Label className="dim">
            {rw.runDays} runs · {formatKm(rw.km)}
          </Label>
        </div>
        <div className="week-chart">
          {days.map((d) => (
            <div key={d.date} className={d.date === ctx.run.runDate ? 'col this' : 'col'}>
              <div className="col-track">
                <div className="col-fill" style={{ height: `${(d.km / maxKm) * 100}%` }} />
              </div>
              <Label className="dim">{formatDay(d.date).slice(0, 2)}</Label>
            </div>
          ))}
        </div>
      </section>

      {duel && (
        <Link href={`${view.base}/week/${ctx.weekIndex + 1}`} className="section">
          <div className="section-head">
            <Label>Duel</Label>
            <Label>{duel.summary.replace(/\.$/, '')}</Label>
          </div>
          <ul className="progress-list">
            {duel.sides.map((s) => (
              <li key={s.runnerId} className="progress-row">
                <span className="progress-name">{runnerName(s.runnerId)}</span>
                <Bar pct={s.kmPct} />
                <span className={s.kmPct >= 100 ? 'progress-pct done' : 'progress-pct'}>
                  {Math.round(s.kmPct)}%
                </span>
              </li>
            ))}
          </ul>
        </Link>
      )}
    </main>
  );
}

export function WeekScreen({ view, weekParam }: { view: SeasonView; weekParam: string }) {
  const { result, runnerName } = view;
  const week = result.weeks[Number(weekParam) - 1];
  if (!week) notFound();

  const runners = [...week.runners].sort((a, b) => b.points - a.points);
  const topRunner = runners[0];
  const status =
    week.status === 'closed' ? 'Final' : week.status === 'open' ? 'In progress' : 'Upcoming';

  return (
    <main className="page with-tabbar">
      <Masthead
        kicker={view.crewName}
        demo={view.demo}
        title={`Week ${week.weekIndex + 1}`}
        meta={
          topRunner && week.status !== 'upcoming'
            ? `${runnerName(topRunner.runnerId)} ${week.status === 'closed' ? 'won the week' : 'leads the week'} with ${topRunner.points} points · ${formatShortDate(week.startDate)} – ${formatShortDate(week.endDate)}`
            : `${formatShortDate(week.startDate)} – ${formatShortDate(week.endDate)} · ${status}`
        }
      />
      <WeekTabs view={view} active={week.weekIndex + 1} />

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
              <Link
                key={side.runnerId}
                href={`${view.base}/runner/${side.runnerId}`}
                className="duel-row"
              >
                <Monogram name={runnerName(side.runnerId)} size={28} />
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
              <Link href={`${view.base}/runner/${rw.runnerId}`} className="row">
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

      <StandingsTable view={view} rows={week.standings} title="Season after this week" />
    </main>
  );
}

export function RunnerScreen({ view, id }: { view: SeasonView; id: string }) {
  const { result, runnersById } = view;
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
      <Link href={`${view.base}/standings`} className="back">
        ← Standings
      </Link>

      <header className="profile">
        <Monogram name={runner.name} size={64} />
        <div className="profile-main">
          <h1>{runner.name}</h1>
          {runner.persona && <p>{runner.persona}</p>}
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
                    <Link href={`${view.base}/run/${run.activityId}`} className="run-row">
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
