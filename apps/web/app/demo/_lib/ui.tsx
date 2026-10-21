import Link from 'next/link';
import type { ReactNode } from 'react';
import { rulesV1, type RuleId, type StandingRow } from '@crew/engine';
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

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={className ? `label ${className}` : 'label'}>{children}</span>;
}

export function Monogram({ id, size = 32 }: { id: string; size?: number }) {
  const name = runnersById.get(id)?.name ?? id;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Movement({ value }: { value: number }) {
  if (value > 0) return <span className="move up">▲ {value}</span>;
  if (value < 0) return <span className="move down">▼ {-value}</span>;
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

/** A circular gauge, Whoop-style: the arc fills to the percentage and turns teal when complete. */
export function Ring({ pct, size = 64 }: { id?: string; pct: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <span className={pct >= 100 ? 'ring done' : 'ring'} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-arc"
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * filled} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-value">{Math.round(pct)}</span>
    </span>
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
        <span className="chip">Demo</span>
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
  const top = rows[0]?.points ?? 0;
  return (
    <section className="section">
      {title && (
        <div className="section-head">
          <Label>{title}</Label>
          <Label className="dim">Points</Label>
        </div>
      )}
      <ol className="table">
        {rows.map((row) => (
          <li key={row.runnerId} className={row.rank === 1 ? 'leader' : undefined}>
            <Link href={`/demo/runner/${row.runnerId}`} className="row">
              <span className="row-rank">{row.rank}</span>
              <Monogram id={row.runnerId} size={38} />
              <span className="row-name">
                {runnerName(row.runnerId)}
                <small>
                  {row.duelWins} duel {row.duelWins === 1 ? 'win' : 'wins'}
                  {row.rank > 1 ? ` · ${top - row.points} behind` : ''}
                </small>
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

/** The feed's opening card: who is winning, by how much, and how everyone compares. */
export function StandingsCard() {
  const rows = result.standings;
  const [leader, second] = rows;
  const finished = result.weeks.every((w) => w.status === 'closed');
  const top = leader?.points ?? 1;
  return (
    <section className="section">
      <div className="section-head">
        <Label>{finished ? 'Final standings' : 'Standings'}</Label>
        <Link href="/demo/standings" className="link-more">
          Full table
        </Link>
      </div>
      {leader && second && (
        <p className="leadline">
          <strong>{runnerName(leader.runnerId)}</strong> {finished ? 'won the season' : 'leads'} by{' '}
          {leader.points - second.points} points
        </p>
      )}
      <ol className="table compact">
        {rows.map((row) => (
          <li key={row.runnerId}>
            <Link href={`/demo/runner/${row.runnerId}`} className="row">
              <span className="row-rank">{row.rank}</span>
              <Monogram id={row.runnerId} size={30} />
              <span className="row-name">
                <span className="row-name-top">
                  {runnerName(row.runnerId)}
                  <Movement value={row.movement} />
                </span>
                <Bar pct={(row.points / top) * 100} />
              </span>
              <span className="row-num">{row.points}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

const MAX_WEEK =
  rulesV1.showUp.pointsPerRun * rulesV1.showUp.maxRuns +
  rulesV1.keepWord[0]!.points +
  rulesV1.ambition.maxPoints +
  rulesV1.duel.win +
  rulesV1.bounty.points;

/** Three steps, in plain words, with the real numbers from the rules. */
export function HowItWorks({ open = false }: { open?: boolean }) {
  const r = rulesV1;
  return (
    <details className="section how" open={open}>
      <summary className="how-summary">
        <span>
          <Label>How a week works</Label>
          <span className="how-short">Commit · Run · Score, up to {MAX_WEEK} points</span>
        </span>
        <span className="how-chevron" aria-hidden />
      </summary>
      <ol className="how-steps">
        <li>
          <span className="how-n">1</span>
          <p>
            <strong>Commit.</strong> By Sunday 23:59, say how many runs and km you&apos;ll do next
            week, within {r.commitmentBand.minKmPct}–{r.commitmentBand.maxKmPct}% of your usual.
          </p>
        </li>
        <li>
          <span className="how-n">2</span>
          <p>
            <strong>Run.</strong> Runs sync from Strava. Pace never counts, and neither does running
            more than you committed.
          </p>
        </li>
        <li>
          <span className="how-n">3</span>
          <p>
            <strong>Score.</strong> {r.showUp.pointsPerRun} per run (up to {r.showUp.maxRuns}),{' '}
            {r.keepWord[0]!.points} for keeping your word, up to {r.ambition.maxPoints} for
            ambition, {r.duel.win} for winning your duel, {r.bounty.points} for the bounty.
          </p>
        </li>
      </ol>
    </details>
  );
}

const RULE_COLUMNS: [RuleId, string][] = [
  ['show-up', 'Runs'],
  ['keep-word', 'Word'],
  ['ambition', 'Ambit.'],
  ['duel', 'Duel'],
  ['bounty', 'Bounty'],
];

/** Season points split by rule, so it is obvious where each score came from. */
export function PointsByRule() {
  const totals = new Map<string, Record<string, number>>();
  for (const week of result.weeks) {
    for (const rw of week.runners) {
      const t = totals.get(rw.runnerId) ?? {};
      for (const line of rw.lines) t[line.rule] = (t[line.rule] ?? 0) + line.points;
      totals.set(rw.runnerId, t);
    }
  }
  return (
    <section className="section">
      <div className="section-head">
        <Label>Where the points came from</Label>
        <Label className="dim">Season</Label>
      </div>
      <table className="score-table">
        <thead>
          <tr>
            <th />
            {RULE_COLUMNS.map(([rule, label]) => (
              <th key={rule}>{label}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {result.standings.map((row) => {
            const t = totals.get(row.runnerId) ?? {};
            return (
              <tr key={row.runnerId}>
                <th scope="row">
                  <Link href={`/demo/runner/${row.runnerId}`}>{runnerName(row.runnerId)}</Link>
                </th>
                {RULE_COLUMNS.map(([rule]) => (
                  <td key={rule}>{t[rule] ?? 0}</td>
                ))}
                <td className="total">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** This week's commitment progress for the whole crew, as ring gauges. */
export function CrewProgress() {
  const week = [...result.weeks].reverse().find((w) => w.status !== 'upcoming') ?? result.weeks[0]!;
  return (
    <section className="section">
      <div className="section-head">
        <Label>Week {week.weekIndex + 1} commitments</Label>
        <Label className="dim">{week.status === 'closed' ? 'Final' : 'Live'}</Label>
      </div>
      <p className="caption">
        Each ring is a runner&apos;s km against their own target. Full ring = word kept.
      </p>
      <ul className="rings">
        {fixture.runners.map((r) => {
          const rw = week.runners.find((x) => x.runnerId === r.id)!;
          return (
            <li key={r.id}>
              <Link href={`/demo/runner/${r.id}`} className="ring-cell">
                <Ring id={r.id} pct={rw.kmPct} size={52} />
                <span>{r.name}</span>
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

function ItemHead({
  runnerId,
  right,
  badge,
}: {
  runnerId: string;
  right: string;
  badge?: ReactNode;
}) {
  return (
    <div className="item-head">
      <Monogram id={runnerId} size={32} />
      <Link href={`/demo/runner/${runnerId}`} className="item-who">
        {runnerName(runnerId)}
        <small>{right}</small>
      </Link>
      {badge}
    </div>
  );
}

/** Points this run earned on its own: show-up points, up to the weekly cap. */
export function runPoints(ctx: RunContext): number {
  const { showUp } = rulesV1;
  return ctx.runNumber !== undefined && ctx.runNumber <= showUp.maxRuns ? showUp.pointsPerRun : 0;
}

function PointsBadge({ ctx }: { ctx: RunContext }) {
  const pts = runPoints(ctx);
  return pts > 0 ? (
    <span className="pts-badge">+{pts} pts</span>
  ) : (
    <span className="pts-badge zero">0 pts</span>
  );
}

function runNote(ctx: RunContext): string {
  if (ctx.runNumber === undefined) return RUN_STATUS[ctx.run.status]!.label;
  return ctx.runNumber <= ctx.commitment.runs
    ? `${ctx.runNumber} of ${ctx.commitment.runs}`
    : `${ctx.runNumber} · extra`;
}

/** Distance, time and pace for one run on a gradient card, as on the feed and the run page. */
export function RunFigures({ ctx, size = 'feed' }: { ctx: RunContext; size?: 'feed' | 'hero' }) {
  const { run } = ctx;
  const status = RUN_STATUS[run.status]!;
  return (
    <div className={`figures size-${size}`}>
      <div className="figures-top">
        <span className="figures-tags">
          {run.bountyClaimed && <span className="glass">Bounty</span>}
          <span className="glass">{run.source === 'strava' ? 'Strava' : 'Manual'}</span>
        </span>
      </div>
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
          <dt>Pace</dt>
          <dd>{formatPace(run.durationS, run.distanceM).replace(' /km', '/km')}</dd>
        </div>
        <div>
          <dt>{status.tone === 'warn' ? 'Status' : 'Run'}</dt>
          <dd>{runNote(ctx)}</dd>
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
      <ItemHead
        runnerId={ctx.runnerId}
        right={`${formatDay(ctx.run.runDate)} · Week ${ctx.weekIndex + 1}`}
        badge={<PointsBadge ctx={ctx} />}
      />
      <Link href={`/demo/run/${ctx.run.activityId}`} className="item-body">
        <RunFigures ctx={ctx} />
      </Link>
      {counts && (
        <div className="item-progress">
          <div className="spread">
            <span className="small muted">
              {Math.round(ctx.pctBefore)}% → {Math.round(ctx.pctAfter)}% of{' '}
              {formatKm(ctx.commitment.km)} target
            </span>
            {ctx.completedCommitment && <span className="small kept">Word kept</span>}
          </div>
          <Bar pct={ctx.pctAfter} from={ctx.pctBefore} />
        </div>
      )}
      <Kudos {...kudosFor(item.id, ctx.runnerId)} />
    </article>
  );
}

function CommitItem({ item }: { item: Extract<FeedItem, { kind: 'commit' }> }) {
  const runner = runnersById.get(item.runnerId)!;
  const above = Math.round((item.km / runner.baselineKm - 1) * 100);
  return (
    <article className="item">
      <ItemHead runnerId={item.runnerId} right={`Committed · ${formatDay(item.at.slice(0, 10))}`} />
      <div className="commit">
        <div>
          <Label className="dim">Week {item.weekIndex + 1}</Label>
          <p className="commit-figures">
            {item.runs} runs · {item.km} km
          </p>
        </div>
        {above !== 0 && (
          <span className={above > 0 ? 'delta up' : 'delta'}>
            {above > 0 ? `+${above}` : above}%
          </span>
        )}
      </div>
      <Kudos {...kudosFor(item.id, item.runnerId)} />
    </article>
  );
}

function OvertakeItem({ item }: { item: Extract<FeedItem, { kind: 'overtake' }> }) {
  return (
    <article className="item">
      <Link href={`/demo/run/${item.activityId}`} className="overtake">
        <span className="overtake-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              d="M12 19V5M5.5 11.5 12 5l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <Label>Overtake</Label>
          <p className="overtake-line">
            {runnerName(item.runnerId)} moves to {ordinal(item.rank)}
          </p>
          <p className="overtake-sub">Passing {item.passed.map(runnerName).join(' and ')}</p>
        </div>
      </Link>
      <Kudos {...kudosFor(item.id)} />
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
          <strong className="item-title">Week {item.weekIndex + 1} results</strong>
          <span className="small muted">
            {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
          </span>
        </div>
        <ol className="podium">
          {top.map((rw, i) => (
            <li key={rw.runnerId}>
              <span className="podium-place">{ordinal(i + 1)}</span>
              <Monogram id={rw.runnerId} size={40} />
              <strong>{runnerName(rw.runnerId)}</strong>
              <span className="podium-pts">{rw.points}</span>
            </li>
          ))}
        </ol>
        <ul className="duel-lines">
          {week.duels.map((d, i) => (
            <li key={i}>
              <span className="muted">
                {d.sides.map((s) => runnerName(s.runnerId)).join(' vs ')}
              </span>
              <strong>{d.summary.replace(/\.$/, '')}</strong>
            </li>
          ))}
        </ul>
      </Link>
      <Kudos {...kudosFor(item.id)} />
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
