import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { result, runnerName, runnersById } from '../../_lib/data';
import { runContexts, weekDays, type RunContext } from '../../_lib/feed';
import { formatDay, formatKm } from '../../_lib/format';
import { Kudos } from '../../_lib/client';
import { demoKudos } from '../../_lib/social';
import { Bar, Label, Monogram, RunFigures } from '../../_lib/ui';

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
  const [statusTitle, statusDetail] = counted(ctx);

  return (
    <main className="page with-tabbar">
      <div className="spread">
        <Link href="/demo" className="back">
          ← Feed
        </Link>
      </div>

      <header className="run-head">
        <Link href={`/demo/runner/${runner.id}`} className="item-head">
          <Monogram id={runner.id} size={36} />
          <span className="item-who">
            {runner.name}
            <small>
              Week {ctx.weekIndex + 1} · {formatDay(ctx.run.runDate)}
            </small>
          </span>
        </Link>
        <RunFigures ctx={ctx} size="hero" />
        <Kudos initial={kudos} names={kudos.by.map(runnerName)} />
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
        <Link href={`/demo/week/${ctx.weekIndex + 1}`} className="section">
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
