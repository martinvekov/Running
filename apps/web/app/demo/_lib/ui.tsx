import Link from 'next/link';
import type { StandingRow } from '@crew/engine';
import { fixture, result, runnerName, runnersById } from './data';
import { Kudos } from './client';
import type { FeedItem, RunContext } from './feed';
import {
  formatDay,
  formatDuration,
  formatKm,
  formatPace,
  formatShortDate,
  RUN_STATUS,
} from './format';
import { demoKudos } from './social';

export function Avatar({ id, size = 40, ring }: { id: string; size?: number; ring?: number }) {
  const name = runnersById.get(id)?.name ?? id;
  const avatar = (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
  if (ring === undefined) return avatar;
  const pct = Math.max(0, Math.min(100, ring));
  return (
    <span
      className={pct >= 100 ? 'avatar-ring done' : 'avatar-ring'}
      style={{ ['--pct' as string]: `${pct}%` }}
    >
      {avatar}
    </span>
  );
}

export function Movement({ value }: { value: number }) {
  if (value > 0) return <span className="move up">▲ {value}</span>;
  if (value < 0) return <span className="move down">▼ {-value}</span>;
  return <span className="move flat">–</span>;
}

export function Progress({ pct, from, label }: { pct: number; from?: number; label?: string }) {
  const width = Math.max(0, Math.min(100, pct));
  const start = Math.max(0, Math.min(100, from ?? 0));
  return (
    <div className="progress" role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      {from !== undefined && <div className="progress-prev" style={{ width: `${start}%` }} />}
      <div className={`progress-fill${pct >= 100 ? ' done' : ''}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function PageTitle({ title, sub, chip }: { title: string; sub?: string; chip?: string }) {
  return (
    <header className="page-title">
      <div className="page-title-row">
        <h1 className="display">{title}</h1>
        {chip && <span className="tag-outline">{chip}</span>}
      </div>
      {sub && <p className="muted small">{sub}</p>}
    </header>
  );
}

export function WeekTabs({ active, weeks }: { active: 'season' | number; weeks: number }) {
  return (
    <nav className="tabs" aria-label="Season or week">
      <Link href="/demo/standings" className={active === 'season' ? 'tab active' : 'tab'}>
        Season
      </Link>
      {Array.from({ length: weeks }, (_, i) => (
        <Link
          key={i}
          href={`/demo/week/${i + 1}`}
          className={active === i + 1 ? 'tab active' : 'tab'}
        >
          Wk {i + 1}
        </Link>
      ))}
    </nav>
  );
}

export function StandingsList({ rows, caption }: { rows: StandingRow[]; caption?: string }) {
  return (
    <section className="card">
      {caption && <h2 className="card-title">{caption}</h2>}
      <ol className="standings">
        {rows.map((row) => (
          <li key={row.runnerId}>
            <Link href={`/demo/runner/${row.runnerId}`} className="standing">
              <span className={`rank display rank-${row.rank}`}>{row.rank}</span>
              <Avatar id={row.runnerId} />
              <span className="standing-name">
                <strong>{runnerName(row.runnerId)}</strong>
                <small>
                  {row.duelWins} duel {row.duelWins === 1 ? 'win' : 'wins'}
                </small>
              </span>
              <Movement value={row.movement} />
              <span className="points display">
                {row.points}
                <small>pts</small>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Crew row at the top of the feed: one ring per runner showing this week's km progress. */
export function CrewRings() {
  const week = [...result.weeks].reverse().find((w) => w.status !== 'upcoming') ?? result.weeks[0]!;
  return (
    <section className="crew-rings" aria-label={`Week ${week.weekIndex + 1} progress`}>
      {fixture.runners.map((r) => {
        const rw = week.runners.find((x) => x.runnerId === r.id)!;
        return (
          <Link key={r.id} href={`/demo/runner/${r.id}`} className="crew-ring">
            <Avatar id={r.id} size={54} ring={rw.kmPct} />
            <span>{r.name}</span>
            <small className="muted">{Math.round(rw.kmPct)}%</small>
          </Link>
        );
      })}
    </section>
  );
}

function FeedHead({ runnerId, when, extra }: { runnerId: string; when: string; extra?: string }) {
  return (
    <div className="feed-head">
      <Avatar id={runnerId} size={38} />
      <div className="feed-who">
        <strong>{runnerName(runnerId)}</strong>
        <small className="muted">
          {when}
          {extra ? ` · ${extra}` : ''}
        </small>
      </div>
    </div>
  );
}

function kudosFor(itemId: string, authorId?: string) {
  const k = demoKudos(itemId, authorId);
  return { initial: k, names: k.by.map(runnerName) };
}

const ORDINALS = ['1st', '2nd', '3rd'];
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;

export function RunPoster({ ctx, large = false }: { ctx: RunContext; large?: boolean }) {
  const { run } = ctx;
  const status = RUN_STATUS[run.status]!;
  return (
    <div className={large ? 'poster large' : 'poster'}>
      <div className="poster-top">
        <span className="poster-day">{formatDay(run.runDate)}</span>
        <span className="poster-meta">
          {run.bountyClaimed && <span className="meta-bounty">Bounty</span>}
          <span className={`meta-source ${run.source}`}>
            {run.source === 'strava' ? 'Strava' : 'Manual'}
          </span>
        </span>
      </div>
      <div className="poster-distance display">
        {(run.distanceM / 1000).toFixed(2)}
        <span>km</span>
      </div>
      <dl className="poster-stats">
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(run.durationS)}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>{formatPace(run.durationS, run.distanceM)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={`status-${status.tone}`}>{status.label}</dd>
        </div>
      </dl>
    </div>
  );
}

function RunCard({ item }: { item: Extract<FeedItem, { kind: 'run' }> }) {
  const { ctx } = item;
  const counts = ctx.run.status === 'counted' || ctx.run.status === 'km-only';
  return (
    <article className="feed-card">
      <FeedHead
        runnerId={ctx.runnerId}
        when={`Week ${ctx.weekIndex + 1}`}
        extra={
          ctx.runNumber !== undefined
            ? ctx.runNumber <= ctx.commitment.runs
              ? `run ${ctx.runNumber} of ${ctx.commitment.runs}`
              : `run ${ctx.runNumber}, beyond their ${ctx.commitment.runs}`
            : RUN_STATUS[ctx.run.status]!.label.toLowerCase()
        }
      />
      <Link href={`/demo/run/${ctx.run.activityId}`} className="feed-body">
        <RunPoster ctx={ctx} />
      </Link>
      {counts && (
        <div className="feed-progress">
          <div className="duel-row small">
            <span className="muted">
              {ctx.completedCommitment
                ? `Commitment complete · ${formatKm(ctx.commitment.km)}`
                : `${Math.round(ctx.pctAfter)}% of ${formatKm(ctx.commitment.km)} this week`}
            </span>
            <span className="muted">
              {Math.round(ctx.pctBefore)}% → {Math.round(ctx.pctAfter)}%
            </span>
          </div>
          <Progress pct={ctx.pctAfter} from={ctx.pctBefore} />
        </div>
      )}
      <Kudos {...kudosFor(item.id, ctx.runnerId)} />
    </article>
  );
}

function CommitCard({ item }: { item: Extract<FeedItem, { kind: 'commit' }> }) {
  const runner = runnersById.get(item.runnerId)!;
  const above = Math.round((item.km / runner.baselineKm - 1) * 100);
  return (
    <article className="feed-card compact">
      <FeedHead runnerId={item.runnerId} when={formatDay(item.at.slice(0, 10))} />
      <div className="feed-statement">
        <span className="muted small">Commitment for week {item.weekIndex + 1}</span>
        <strong className="display">
          {item.runs} runs · {item.km} km
        </strong>
        {above !== 0 && (
          <span className="muted small">
            {above > 0 ? `${above}% above` : `${-above}% below`} their usual week
          </span>
        )}
      </div>
      <Kudos {...kudosFor(item.id, item.runnerId)} />
    </article>
  );
}

function OvertakeCard({ item }: { item: Extract<FeedItem, { kind: 'overtake' }> }) {
  const passed = item.passed.map(runnerName);
  return (
    <article className="feed-card">
      <Link href={`/demo/run/${item.activityId}`} className="overtake-body">
        <span className="overtake-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M12 19V5M5.5 11.5 12 5l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="overtake-line">
            {runnerName(item.runnerId)} moves up to {ordinal(item.rank)}
          </p>
          <p className="muted small">Passed {passed.join(' and ')} in the season standings</p>
        </div>
      </Link>
      <Kudos {...kudosFor(item.id)} />
    </article>
  );
}

function WeekCard({ item }: { item: Extract<FeedItem, { kind: 'week' }> }) {
  const week = result.weeks[item.weekIndex]!;
  const top = [...week.runners].sort((a, b) => b.points - a.points).slice(0, 3);
  return (
    <article className="feed-card">
      <Link href={`/demo/week/${item.weekIndex + 1}`} className="week-wrap-body">
        <div className="duel-row">
          <strong>Week {item.weekIndex + 1} results</strong>
          <span className="muted small">
            {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
          </span>
        </div>
        <ol className="podium">
          {top.map((rw, i) => (
            <li key={rw.runnerId}>
              <span className="podium-rank">{i + 1}</span>
              <Avatar id={rw.runnerId} size={28} />
              <span>{runnerName(rw.runnerId)}</span>
              <span className="podium-pts">{rw.points} pts</span>
            </li>
          ))}
        </ol>
        <ul className="wrap-duels">
          {week.duels.map((d, i) => (
            <li key={i}>
              {d.sides.map((side) => runnerName(side.runnerId)).join(', ')}: {d.summary}
            </li>
          ))}
        </ul>
        <span className="link-more">View week</span>
      </Link>
      <Kudos {...kudosFor(item.id)} />
    </article>
  );
}

export function FeedList({ items }: { items: FeedItem[] }) {
  return (
    <div className="feed">
      {items.map((item) => {
        switch (item.kind) {
          case 'run':
            return <RunCard key={item.id} item={item} />;
          case 'commit':
            return <CommitCard key={item.id} item={item} />;
          case 'overtake':
            return <OvertakeCard key={item.id} item={item} />;
          case 'week':
            return <WeekCard key={item.id} item={item} />;
        }
      })}
    </div>
  );
}
