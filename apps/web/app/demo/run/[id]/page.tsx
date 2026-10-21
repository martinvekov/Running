import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { result, runnerName, runnersById } from '../../_lib/data';
import { runContexts, weekDays } from '../../_lib/feed';
import { formatDay, formatKm } from '../../_lib/format';
import { Kudos } from '../../_lib/client';
import { demoKudos } from '../../_lib/social';
import { Avatar, Progress, RunPoster } from '../../_lib/ui';

export function generateStaticParams() {
  return [...runContexts.keys()].map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = runContexts.get((await params).id);
  if (!ctx) return {};
  return {
    title: `${runnerName(ctx.runnerId)} · ${formatKm(ctx.run.distanceM / 1000)} · Crew Seasons`,
  };
}

function countedFor(ctx: NonNullable<ReturnType<typeof runContexts.get>>): string[] {
  const { run, commitment } = ctx;
  switch (run.status) {
    case 'too-short':
      return ['Too short to count: a run needs 15 minutes or 2 km.'];
    case 'logged-late':
      return [
        'Arrived too late to count: runs must be in by 23:59 two days after, and before Monday 12:00.',
      ];
    case 'km-only':
      return ['Second run that day: the km count, but only one run per day counts as a run.'];
    case 'counted':
      return [
        ctx.runNumber! <= commitment.runs
          ? `Run ${ctx.runNumber} of ${commitment.runs} committed this week.`
          : `Run ${ctx.runNumber}: beyond the ${commitment.runs} committed.`,
      ];
  }
}

export default async function DemoRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = runContexts.get(id);
  if (!ctx) notFound();

  const runner = runnersById.get(ctx.runnerId)!;
  const week = result.weeks[ctx.weekIndex]!;
  const rw = week.runners.find((r) => r.runnerId === ctx.runnerId)!;
  const duel = week.duels.find((d) => d.sides.some((s) => s.runnerId === ctx.runnerId));
  const mySide = duel?.sides.find((s) => s.runnerId === ctx.runnerId);
  const days = weekDays(ctx.runnerId, ctx.weekIndex);
  const maxKm = Math.max(...days.map((d) => d.km), 1);
  const qualifies = ctx.run.status === 'counted' || ctx.run.status === 'km-only';
  const kudos = demoKudos(`run-${id}`, ctx.runnerId);

  return (
    <main className="page with-tabbar">
      <div className="run-topbar">
        <Link href="/demo" className="back">
          ← Feed
        </Link>
        <Link href={`/demo/runner/${runner.id}`} className="run-owner">
          <Avatar id={runner.id} size={28} />
          <strong>{runner.name}</strong>
        </Link>
      </div>

      <RunPoster ctx={ctx} large />
      <Kudos initial={kudos} names={kudos.by.map(runnerName)} />

      <section className="card">
        <h2 className="card-title">What it counted for</h2>
        <ul className="counted-for">
          {countedFor(ctx).map((line) => (
            <li key={line}>{line}</li>
          ))}
          {ctx.run.bountyClaimed && <li>Claimed the bounty: “{week.bounty}”.</li>}
        </ul>
        {qualifies && (
          <div className="commitment">
            <div className="duel-row small">
              <span className="muted">
                Week {ctx.weekIndex + 1} word: {rw.commitment.runs} runs ·{' '}
                {formatKm(rw.commitment.km)}
              </span>
              <span>
                {Math.round(ctx.pctBefore)}% → <strong>{Math.round(ctx.pctAfter)}%</strong>
              </span>
            </div>
            <Progress pct={ctx.pctAfter} from={ctx.pctBefore} />
            {ctx.completedCommitment && (
              <p className="finish-line">
                This run completed the commitment
                {mySide?.completedOn
                  ? `, setting the duel finish on ${formatDay(mySide.completedOn)}`
                  : ''}
                .
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Week {ctx.weekIndex + 1} at a glance</h2>
        <div className="week-bars">
          {days.map((d) => (
            <div key={d.date} className={d.date === ctx.run.runDate ? 'bar this' : 'bar'}>
              <div className="bar-track">
                <div className="bar-fill" style={{ height: `${(d.km / maxKm) * 100}%` }} />
              </div>
              <small>{formatDay(d.date).slice(0, 1)}</small>
            </div>
          ))}
        </div>
        <div className="duel-row small">
          <span className="muted">
            {rw.runDays} runs · {formatKm(rw.km)}
          </span>
          <Link href={`/demo/runner/${runner.id}`} className="link-more">
            {runner.name}&apos;s season →
          </Link>
        </div>
      </section>

      {duel && mySide && (
        <Link href={`/demo/week/${ctx.weekIndex + 1}`} className="card duel-teaser">
          <span className="eyebrow">Week {ctx.weekIndex + 1} duel</span>
          <div className="duel-teaser-row">
            {duel.sides.map((s) => (
              <span key={s.runnerId} className="duel-teaser-side">
                <Avatar id={s.runnerId} size={34} />
                <span className="display duel-pct">{Math.round(s.kmPct)}%</span>
              </span>
            ))}
          </div>
          <p className="muted small">{duel.summary}</p>
        </Link>
      )}
    </main>
  );
}
