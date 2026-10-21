import Link from 'next/link';
import type { ReactNode } from 'react';
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

const ORDINALS = ['1st', '2nd', '3rd'];
export const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Small monospaced caps: the labelling voice of the whole app. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={className ? `label ${className}` : 'label'}>{children}</span>;
}

export function Monogram({ id, size = 32 }: { id: string; size?: number }) {
  const name = runnersById.get(id)?.name ?? id;
  return (
    <span
      className="mono-avatar"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Movement({ value }: { value: number }) {
  if (value > 0) return <span className="move up">+{value}</span>;
  if (value < 0) return <span className="move down">−{-value}</span>;
  return <span className="move" />;
}

export function Bar({ pct, from, label }: { pct: number; from?: number; label?: string }) {
  const width = Math.max(0, Math.min(100, pct));
  const start = Math.max(0, Math.min(100, from ?? 0));
  return (
    <div className="bar" role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <div className={pct >= 100 ? 'bar-fill done' : 'bar-fill'} style={{ width: `${width}%` }} />
      {from !== undefined && <div className="bar-prev" style={{ width: `${start}%` }} />}
    </div>
  );
}

export function Masthead({
  kicker,
  title,
  meta,
}: {
  kicker: string;
  title: string;
  meta?: string | undefined;
}) {
  return (
    <header className="masthead">
      <div className="masthead-top">
        <Label>{kicker}</Label>
        <Label className="dim">Demo · fictional runners</Label>
      </div>
      <h1>{title}</h1>
      {meta && <p className="masthead-meta">{meta}</p>}
    </header>
  );
}

export function WeekTabs({ active, weeks }: { active: 'season' | number; weeks: number }) {
  return (
    <nav className="seg" aria-label="Season or week">
      <Link href="/demo/standings" className={active === 'season' ? 'seg-item active' : 'seg-item'}>
        Season
      </Link>
      {Array.from({ length: weeks }, (_, i) => (
        <Link
          key={i}
          href={`/demo/week/${i + 1}`}
          className={active === i + 1 ? 'seg-item active' : 'seg-item'}
        >
          Week {i + 1}
        </Link>
      ))}
    </nav>
  );
}

export function StandingsTable({ rows, title }: { rows: StandingRow[]; title?: string }) {
  return (
    <section className="section">
      {title && (
        <div className="section-head">
          <Label>{title}</Label>
          <Label className="dim">Pts</Label>
        </div>
      )}
      <ol className="table">
        {rows.map((row) => (
          <li key={row.runnerId} className={row.rank === 1 ? 'leader' : undefined}>
            <Link href={`/demo/runner/${row.runnerId}`} className="row">
              <span className="row-rank">{pad2(row.rank)}</span>
              <Monogram id={row.runnerId} />
              <span className="row-name">
                {runnerName(row.runnerId)}
                <Label className="dim">
                  {row.duelWins} duel {row.duelWins === 1 ? 'win' : 'wins'}
                </Label>
              </span>
              <Movement value={row.movement} />
              <span className="row-num">{row.points}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** This week's commitment progress for the whole crew, at the top of the feed. */
export function CrewProgress() {
  const week = [...result.weeks].reverse().find((w) => w.status !== 'upcoming') ?? result.weeks[0]!;
  return (
    <section className="section">
      <div className="section-head">
        <Label>Week {week.weekIndex + 1} · commitments</Label>
        <Label className="dim">{week.status === 'closed' ? 'Final' : 'Live'}</Label>
      </div>
      <ul className="progress-list">
        {fixture.runners.map((r) => {
          const rw = week.runners.find((x) => x.runnerId === r.id)!;
          return (
            <li key={r.id}>
              <Link href={`/demo/runner/${r.id}`} className="progress-row">
                <span className="progress-name">{r.name}</span>
                <Bar pct={rw.kmPct} />
                <span className={rw.kmPct >= 100 ? 'progress-pct done' : 'progress-pct'}>
                  {Math.round(rw.kmPct)}%
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function kudosFor(itemId: string, authorId?: string) {
  const k = demoKudos(itemId, authorId);
  return { initial: k, names: k.by.map(runnerName) };
}

function ItemHead({ runnerId, right }: { runnerId: string; right: string }) {
  return (
    <div className="item-head">
      <Monogram id={runnerId} size={28} />
      <Link href={`/demo/runner/${runnerId}`} className="item-who">
        {runnerName(runnerId)}
      </Link>
      <Label className="dim">{right}</Label>
    </div>
  );
}

function runNote(ctx: RunContext): string {
  if (ctx.runNumber === undefined) return RUN_STATUS[ctx.run.status]!.label;
  return ctx.runNumber <= ctx.commitment.runs
    ? `Run ${ctx.runNumber}/${ctx.commitment.runs}`
    : `Run ${ctx.runNumber} · extra`;
}

/** Distance, time and pace for one run, as on the feed and the run page. */
export function RunFigures({ ctx, size = 'feed' }: { ctx: RunContext; size?: 'feed' | 'hero' }) {
  const { run } = ctx;
  const status = RUN_STATUS[run.status]!;
  return (
    <div className={`figures size-${size}`}>
      <p className="figure-main">
        {(run.distanceM / 1000).toFixed(2)}
        <span>km</span>
      </p>
      <dl className="figure-grid">
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(run.durationS)}</dd>
        </div>
        <div>
          <dt>Pace /km</dt>
          <dd>{formatPace(run.durationS, run.distanceM).replace(' /km', '')}</dd>
        </div>
        <div>
          <dt>Week {ctx.weekIndex + 1}</dt>
          <dd className={status.tone === 'warn' ? 'warn' : undefined}>{runNote(ctx)}</dd>
        </div>
      </dl>
    </div>
  );
}

function RunItem({ item }: { item: Extract<FeedItem, { kind: 'run' }> }) {
  const { ctx } = item;
  const counts = ctx.run.status === 'counted' || ctx.run.status === 'km-only';
  return (
    <article className="item">
      <ItemHead runnerId={ctx.runnerId} right={formatDay(ctx.run.runDate)} />
      <Link href={`/demo/run/${ctx.run.activityId}`} className="item-body">
        <RunFigures ctx={ctx} />
      </Link>
      {counts && (
        <div className="item-progress">
          <Bar pct={ctx.pctAfter} from={ctx.pctBefore} />
          <div className="spread">
            <Label className="dim">
              {Math.round(ctx.pctBefore)} → {Math.round(ctx.pctAfter)}% of{' '}
              {formatKm(ctx.commitment.km)}
            </Label>
            {ctx.completedCommitment && <Label className="tick">Commitment kept</Label>}
          </div>
        </div>
      )}
      <div className="item-foot">
        <Kudos {...kudosFor(item.id, ctx.runnerId)} />
        <span className="item-tags">
          {ctx.run.bountyClaimed && <Label className="tag-bounty">Bounty</Label>}
          <Label className={`src ${ctx.run.source}`}>
            {ctx.run.source === 'strava' ? 'Strava' : 'Manual'}
          </Label>
        </span>
      </div>
    </article>
  );
}

function CommitItem({ item }: { item: Extract<FeedItem, { kind: 'commit' }> }) {
  const runner = runnersById.get(item.runnerId)!;
  const above = Math.round((item.km / runner.baselineKm - 1) * 100);
  return (
    <article className="item">
      <ItemHead runnerId={item.runnerId} right={formatDay(item.at.slice(0, 10))} />
      <div className="commit">
        <Label className="dim">Commits to week {item.weekIndex + 1}</Label>
        <p className="commit-figures">
          {item.runs}
          <span>runs</span>
          {item.km}
          <span>km</span>
        </p>
        {above !== 0 && (
          <Label className={above > 0 ? 'tick' : 'dim'}>
            {above > 0 ? `+${above}` : above}% vs usual week
          </Label>
        )}
      </div>
      <div className="item-foot">
        <Kudos {...kudosFor(item.id, item.runnerId)} />
      </div>
    </article>
  );
}

function OvertakeItem({ item }: { item: Extract<FeedItem, { kind: 'overtake' }> }) {
  return (
    <article className="item band">
      <Link href={`/demo/run/${item.activityId}`} className="band-body">
        <Label className="tick">Overtake</Label>
        <p className="band-line">
          {runnerName(item.runnerId)} moves to {ordinal(item.rank)}
        </p>
        <Label className="dim">Passing {item.passed.map(runnerName).join(' and ')}</Label>
      </Link>
    </article>
  );
}

function WeekItem({ item }: { item: Extract<FeedItem, { kind: 'week' }> }) {
  const week = result.weeks[item.weekIndex]!;
  const top = [...week.runners].sort((a, b) => b.points - a.points).slice(0, 3);
  return (
    <article className="item">
      <Link href={`/demo/week/${item.weekIndex + 1}`} className="item-body">
        <div className="spread">
          <Label>Week {item.weekIndex + 1} · final</Label>
          <Label className="dim">
            {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
          </Label>
        </div>
        <ol className="mini-table">
          {top.map((rw, i) => (
            <li key={rw.runnerId}>
              <span className="row-rank">{pad2(i + 1)}</span>
              <span>{runnerName(rw.runnerId)}</span>
              <span className="row-num">{rw.points}</span>
            </li>
          ))}
        </ol>
        <ul className="duel-lines">
          {week.duels.map((d, i) => (
            <li key={i}>
              <Label className="dim">
                {d.sides.map((s) => runnerName(s.runnerId)).join(' / ')}
              </Label>
              <Label>{d.summary.replace(/\.$/, '')}</Label>
            </li>
          ))}
        </ul>
      </Link>
      <div className="item-foot">
        <Kudos {...kudosFor(item.id)} />
      </div>
    </article>
  );
}

export function Feed({ items }: { items: FeedItem[] }) {
  return (
    <div className="feed">
      {items.map((item) => {
        switch (item.kind) {
          case 'run':
            return <RunItem key={item.id} item={item} />;
          case 'commit':
            return <CommitItem key={item.id} item={item} />;
          case 'overtake':
            return <OvertakeItem key={item.id} item={item} />;
          case 'week':
            return <WeekItem key={item.id} item={item} />;
        }
      })}
    </div>
  );
}
