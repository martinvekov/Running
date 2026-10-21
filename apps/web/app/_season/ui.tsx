import Link from 'next/link';
import type { ReactNode } from 'react';
import { maxWeeklyPoints, rulesV1, type RuleId, type StandingRow } from '@crew/engine';
import { leadLine } from './lead';
import type { SeasonView } from './view';
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
import { EXAMPLE, exampleWeek } from './example';
import { demoKudos } from './social';

const ORDINALS = ['1st', '2nd', '3rd'];
export const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;
export const pad2 = (n: number) => String(n).padStart(2, '0');

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={className ? `label ${className}` : 'label'}>{children}</span>;
}

export function Monogram({ name, size = 32 }: { name: string; size?: number }) {
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
export function Ring({ pct, size = 64 }: { pct: number; size?: number }) {
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
  demo = false,
}: {
  kicker: string;
  title: string;
  meta?: string | undefined;
  demo?: boolean;
}) {
  return (
    <header className="masthead">
      <div className="masthead-top">
        <Label>{kicker}</Label>
        {demo && <span className="chip">Demo</span>}
      </div>
      <h1>{title}</h1>
      {meta && <p className="masthead-meta">{meta}</p>}
    </header>
  );
}

export function WeekTabs({ view, active }: { view: SeasonView; active: 'season' | number }) {
  const weeks = view.result.weeks.length;
  return (
    <nav className="seg" aria-label="Season or week">
      <Link
        href={`${view.base}/standings`}
        className={active === 'season' ? 'seg-item active' : 'seg-item'}
      >
        Season
      </Link>
      {Array.from({ length: weeks }, (_, i) => (
        <Link
          key={i}
          href={`${view.base}/week/${i + 1}`}
          className={active === i + 1 ? 'seg-item active' : 'seg-item'}
        >
          Week {i + 1}
        </Link>
      ))}
    </nav>
  );
}

export function StandingsTable({
  view,
  rows,
  title,
}: {
  view: SeasonView;
  rows: StandingRow[];
  title?: string;
}) {
  const top = rows[0]?.points ?? 0;
  const { runnerName } = view;
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
          <li
            key={row.runnerId}
            className={row.rank === 1 && rows[1]?.rank !== 1 ? 'leader' : undefined}
          >
            <Link href={`${view.base}/runner/${row.runnerId}`} className="row">
              <span className="row-rank">{row.rank}</span>
              <Monogram name={view.runnerName(row.runnerId)} size={38} />
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
export function StandingsCard({ view }: { view: SeasonView }) {
  const { result } = view;
  const rows = result.standings;
  const { runnerName } = view;
  const [leader] = rows;
  const finished = result.weeks.every((w) => w.status === 'closed');
  const lead = leadLine(view, finished);
  const top = Math.max(leader?.points ?? 0, 1);
  return (
    <section className="section">
      <div className="section-head">
        <Label>{finished ? 'Final standings' : 'Standings'}</Label>
        <Link href={`${view.base}/standings`} className="link-more">
          Full table
        </Link>
      </div>
      {lead && (
        <p className="leadline">
          {lead.name && <strong>{lead.name}</strong>} {lead.text}
        </p>
      )}
      <ol className="table compact">
        {rows.map((row) => (
          <li key={row.runnerId}>
            <Link href={`${view.base}/runner/${row.runnerId}`} className="row">
              <span className="row-rank">{row.rank}</span>
              <Monogram name={view.runnerName(row.runnerId)} size={30} />
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

/** The whole game in plain words, with the real numbers from rules v1 and a worked example. */
export function HowItWorks({ open = false }: { open?: boolean }) {
  const r = rulesV1;
  const max = maxWeeklyPoints(r);
  const [tier, near] = r.keepWord;
  const exampleLines = exampleWeek.lines.filter((l) => l.rule !== 'duel' && l.rule !== 'bounty');
  return (
    <details className="section how" open={open}>
      <summary className="how-summary">
        <span>
          <Label>How it works</Label>
          <span className="how-short">Set your week, run it, earn up to {max} points</span>
        </span>
        <span className="how-chevron" aria-hidden />
      </summary>

      <p className="how-intro">
        Everyone is scored against their own normal week, so a beginner and a marathoner can both
        win. The aim is to do what you said you would.
      </p>

      <ol className="how-steps">
        <li>
          <span className="how-n">1</span>
          <p>
            <strong>Set your week.</strong> By Sunday 23:59, tell the crew how many runs and km
            you&apos;ll do next week. Stay between {r.commitmentBand.minKmPct}% and{' '}
            {r.commitmentBand.maxKmPct}% of your usual km. Miss the deadline and last week&apos;s
            plan carries over.
          </p>
        </li>
        <li>
          <span className="how-n">2</span>
          <p>
            <strong>Run.</strong> Your runs arrive from Strava on their own, or log one by hand.
            Pace doesn&apos;t matter, and running more than you promised earns nothing extra.
          </p>
        </li>
        <li>
          <span className="how-n">3</span>
          <p>
            <strong>Earn points.</strong> You can score up to {max} a week, five ways:
          </p>
        </li>
      </ol>

      <ul className="breakdown how-points">
        <li>
          <div>
            <span className="breakdown-rule">Show up</span>
            <p>
              Any run of {r.qualifyingRun.minDurationS / 60}+ minutes or{' '}
              {r.qualifyingRun.minDistanceM / 1000}+ km. One run a day counts, up to{' '}
              {r.showUp.maxRuns} a week.
            </p>
          </div>
          <span className="breakdown-pts">+{r.showUp.pointsPerRun} each</span>
        </li>
        <li>
          <div>
            <span className="breakdown-rule">Keep your word</span>
            <p>
              Do every run you promised and at least {tier?.minKmPct}% of your km. A close miss (one
              run short, {near?.minKmPct}%+ of your km) still earns {near?.points}.
            </p>
          </div>
          <span className="breakdown-pts">+{tier?.points}</span>
        </li>
        <li>
          <div>
            <span className="breakdown-rule">Ambition</span>
            <p>
              A bonus for promising more than usual: +{r.ambition.pointsPerStep} for every{' '}
              {r.ambition.stepPct}% above your normal km, if you keep your word.
            </p>
          </div>
          <span className="breakdown-pts">up to +{r.ambition.maxPoints}</span>
        </li>
        <li>
          <div>
            <span className="breakdown-rule">Duel</span>
            <p>
              Each week you&apos;re matched with a crew mate. The first to finish their own
              commitment wins. A draw is worth {r.duel.draw}.
            </p>
          </div>
          <span className="breakdown-pts">+{r.duel.win}</span>
        </li>
        <li>
          <div>
            <span className="breakdown-rule">Bounty</span>
            <p>Claim the week&apos;s challenge on a run, like a run before 7am.</p>
          </div>
          <span className="breakdown-pts">+{r.bounty.points}</span>
        </li>
      </ul>

      <div className="how-example">
        <Label>Example</Label>
        <p>
          {EXAMPLE.name} usually runs {EXAMPLE.usual.runs} times, {EXAMPLE.usual.km} km. She commits
          to {EXAMPLE.committed.runs} runs, {EXAMPLE.committed.km} km, then does {EXAMPLE.did.runs}{' '}
          runs, {EXAMPLE.did.km} km.
        </p>
        <dl>
          {exampleLines.map((line) => (
            <div key={line.rule}>
              <dt>{RULE_NAMES[line.rule]}</dt>
              <dd>+{line.points}</dd>
            </div>
          ))}
          <div className="how-example-total">
            <dt>Before her duel and the bounty</dt>
            <dd>{exampleLines.reduce((sum, l) => sum + l.points, 0)}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

const RULE_NAMES: Record<RuleId, string> = {
  'show-up': 'Show up',
  'keep-word': 'Keep your word',
  ambition: 'Ambition',
  duel: 'Duel',
  bounty: 'Bounty',
};

const RULE_COLUMNS: [RuleId, string][] = [
  ['show-up', 'Runs'],
  ['keep-word', 'Word'],
  ['ambition', 'Ambit.'],
  ['duel', 'Duel'],
  ['bounty', 'Bounty'],
];

/** Season points split by rule, so it is obvious where each score came from. */
export function PointsByRule({ view }: { view: SeasonView }) {
  const { result, runnerName } = view;
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
                  <Link href={`${view.base}/runner/${row.runnerId}`}>
                    {runnerName(row.runnerId)}
                  </Link>
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
export function CrewProgress({ view }: { view: SeasonView }) {
  const { result } = view;
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
        {view.runners.map((r) => {
          const rw = week.runners.find((x) => x.runnerId === r.id)!;
          return (
            <li key={r.id}>
              <Link href={`${view.base}/runner/${r.id}`} className="ring-cell">
                <Ring pct={rw.kmPct} size={52} />
                <span>{r.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function kudosFor(view: SeasonView, itemId: string, authorId?: string) {
  const k = demoKudos(view.runners, itemId, authorId);
  return { initial: k, names: k.by.map(view.runnerName) };
}

function ItemHead({
  view,
  runnerId,
  right,
  badge,
}: {
  view: SeasonView;
  runnerId: string;
  right: string;
  badge?: ReactNode;
}) {
  const { runnerName } = view;
  return (
    <div className="item-head">
      <Monogram name={view.runnerName(runnerId)} size={32} />
      {view.runnersById.has(runnerId) ? (
        <Link href={`${view.base}/runner/${runnerId}`} className="item-who">
          {runnerName(runnerId)}
          <small>{right}</small>
        </Link>
      ) : (
        <span className="item-who">
          {runnerName(runnerId)}
          <small>{right}</small>
        </span>
      )}
      {badge}
    </div>
  );
}

/** Points this run earned on its own (show-up points), as scored by the engine. */
export function runPoints(ctx: RunContext): number {
  return ctx.showUpPoints;
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

function RunItem({ view, item }: { view: SeasonView; item: Extract<FeedItem, { kind: 'run' }> }) {
  const { ctx } = item;
  const counts = ctx.run.status === 'counted' || ctx.run.status === 'km-only';
  return (
    <article className="item">
      <ItemHead
        view={view}
        runnerId={ctx.runnerId}
        right={`${formatDay(ctx.run.runDate)} · Week ${ctx.weekIndex + 1}`}
        badge={<PointsBadge ctx={ctx} />}
      />
      <Link href={`${view.base}/run/${ctx.run.activityId}`} className="item-body">
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
      {view.demo && <Kudos {...kudosFor(view, item.id, ctx.runnerId)} />}
    </article>
  );
}

function CommitItem({
  view,
  item,
}: {
  view: SeasonView;
  item: Extract<FeedItem, { kind: 'commit' }>;
}) {
  const runner = view.runnersById.get(item.runnerId)!;
  const above = Math.round((item.km / runner.baselineKm - 1) * 100);
  return (
    <article className="item">
      <ItemHead
        view={view}
        runnerId={item.runnerId}
        right={`Committed · ${formatDay(item.at.slice(0, 10))}`}
      />
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
      {view.demo && <Kudos {...kudosFor(view, item.id, item.runnerId)} />}
    </article>
  );
}

function OvertakeItem({
  view,
  item,
}: {
  view: SeasonView;
  item: Extract<FeedItem, { kind: 'overtake' }>;
}) {
  const { runnerName } = view;
  return (
    <article className="item">
      <Link href={`${view.base}/run/${item.activityId}`} className="overtake">
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
      {view.demo && <Kudos {...kudosFor(view, item.id)} />}
    </article>
  );
}

function WeekItem({ view, item }: { view: SeasonView; item: Extract<FeedItem, { kind: 'week' }> }) {
  const { runnerName } = view;
  const week = view.result.weeks[item.weekIndex]!;
  const top = [...week.runners].sort((a, b) => b.points - a.points).slice(0, 3);
  return (
    <article className="item">
      <Link href={`${view.base}/week/${item.weekIndex + 1}`} className="item-body">
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
              <Monogram name={view.runnerName(rw.runnerId)} size={40} />
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
      {view.demo && <Kudos {...kudosFor(view, item.id)} />}
    </article>
  );
}

function PastRunItem({
  view,
  item,
}: {
  view: SeasonView;
  item: Extract<FeedItem, { kind: 'past' }>;
}) {
  const start = view.input.season.startDate;
  const figures = (
    <div className="figures size-feed">
      <div className="figures-top">
        <span className="figures-tags">
          <span className="glass">{item.source === 'strava' ? 'Strava' : 'Manual'}</span>
        </span>
      </div>
      <p className="figure-main">
        {(item.distanceM / 1000).toFixed(2)}
        <span>km</span>
      </p>
      <dl className="figure-grid">
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(item.durationS)}</dd>
        </div>
        <div>
          <dt>Pace</dt>
          <dd>{formatPace(item.durationS, item.distanceM).replace(' /km', '/km')}</dd>
        </div>
        <div>
          <dt>Run</dt>
          <dd>{item.runDate < start ? 'Pre-season' : 'Post-season'}</dd>
        </div>
      </dl>
    </div>
  );
  return (
    <article className="item">
      <ItemHead
        view={view}
        runnerId={item.runnerId}
        right={formatDay(item.runDate)}
        badge={<span className="pts-badge zero">Not scored</span>}
      />
      {item.linkUrl ? (
        <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="item-body">
          {figures}
        </a>
      ) : (
        <div className="item-body">{figures}</div>
      )}
    </article>
  );
}

export const EARLIER_STEP = 15;

/** The crew feed. Runs outside the season are shown as cards too, a few at a time. */
export function Feed({ view, earlier = EARLIER_STEP }: { view: SeasonView; earlier?: number }) {
  let shownPast = 0;
  const items = view.feed.filter((item) => {
    if (item.kind !== 'past') return true;
    shownPast += 1;
    return shownPast <= earlier;
  });
  const hidden = view.feed.filter((i) => i.kind === 'past').length - Math.min(shownPast, earlier);
  return (
    <div className="feed">
      {items.map((item) => {
        switch (item.kind) {
          case 'past':
            return <PastRunItem key={item.id} view={view} item={item} />;
          case 'run':
            return <RunItem key={item.id} view={view} item={item} />;
          case 'commit':
            return <CommitItem key={item.id} view={view} item={item} />;
          case 'overtake':
            return <OvertakeItem key={item.id} view={view} item={item} />;
          case 'week':
            return <WeekItem key={item.id} view={view} item={item} />;
        }
      })}
      {hidden > 0 && (
        <Link
          href={`${view.base}?earlier=${earlier + EARLIER_STEP}`}
          scroll={false}
          className="btn-secondary"
        >
          Show {Math.min(EARLIER_STEP, hidden)} more earlier runs
        </Link>
      )}
    </div>
  );
}
