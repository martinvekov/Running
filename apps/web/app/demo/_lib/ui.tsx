import Link from 'next/link';
import type { StandingRow } from '@crew/engine';
import { fixture, runnersById } from './data';

const AVATAR_HUES = [152, 32, 228, 300, 88, 12, 188, 268];

/** A distinct hue per runner, in roster order. */
function hueFor(id: string): number {
  const index = fixture.runners.findIndex((r) => r.id === id);
  return AVATAR_HUES[Math.max(0, index) % AVATAR_HUES.length]!;
}

export function Avatar({ id, size = 40 }: { id: string; size?: number }) {
  const name = runnersById.get(id)?.name ?? id;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, ['--hue' as string]: hueFor(id) }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Movement({ value }: { value: number }) {
  if (value > 0) return <span className="move up">▲ {value}</span>;
  if (value < 0) return <span className="move down">▼ {-value}</span>;
  return <span className="move flat">–</span>;
}

export function Progress({ pct, label }: { pct: number; label?: string }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className="progress" role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <div className={`progress-fill${pct >= 100 ? ' done' : ''}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function WeekTabs({ active, weeks }: { active: 'season' | number; weeks: number }) {
  return (
    <nav className="tabs" aria-label="Season or week">
      <Link href="/demo" className={active === 'season' ? 'tab active' : 'tab'}>
        Season
      </Link>
      {Array.from({ length: weeks }, (_, i) => (
        <Link
          key={i}
          href={`/demo/week/${i + 1}`}
          className={active === i + 1 ? 'tab active' : 'tab'}
        >
          Week {i + 1}
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
        {rows.map((row) => {
          const runner = runnersById.get(row.runnerId);
          return (
            <li key={row.runnerId}>
              <Link href={`/demo/runner/${row.runnerId}`} className="standing">
                <span className={`rank rank-${row.rank}`}>{row.rank}</span>
                <Avatar id={row.runnerId} />
                <span className="standing-name">
                  <strong>{runner?.name}</strong>
                  <small>
                    {row.duelWins} duel {row.duelWins === 1 ? 'win' : 'wins'}
                  </small>
                </span>
                <Movement value={row.movement} />
                <span className="points">
                  {row.points}
                  <small>pts</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function DemoHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="demo-header">
      <Link href="/demo" className="brand">
        <span className="brand-mark" aria-hidden>
          ◆
        </span>
        Crew Seasons
      </Link>
      <span className="badge">Demo</span>
      <p className="subtitle">{subtitle}</p>
    </header>
  );
}
