import type { Fixture } from '../fixtures';
import type { Activity, SeasonResult, StandingRow } from '../src/types';

const RULE_LABELS: Record<string, string> = {
  'show-up': 'Show up',
  'keep-word': 'Keep your word',
  ambition: 'Ambition',
  duel: 'Duel',
  bounty: 'Bounty',
};

const STATUS_LABELS: Record<string, string> = {
  counted: 'counted',
  'km-only': 'km only (second run that day)',
  'too-short': 'too short',
  'logged-late': 'logged late',
};

function pace(durationS: number, distanceM: number): string {
  if (distanceM === 0) return '–';
  const s = Math.round(durationS / (distanceM / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/km`;
}

function duration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

function movement(m: number): string {
  return m > 0 ? `▲${m}` : m < 0 ? `▼${-m}` : '–';
}

function standingsTable(rows: StandingRow[], name: (id: string) => string): string[] {
  return [
    '| # | Runner | Points | Move | Duel wins | Weeks word kept |',
    '| --: | --- | --: | :-: | --: | --: |',
    ...rows.map(
      (r) =>
        `| ${r.rank} | ${name(r.runnerId)} | ${r.points} | ${movement(r.movement)} | ${r.duelWins} | ${r.weeksWordKept} |`,
    ),
  ];
}

/** Renders a scored season as markdown: standings, duels and every runner's breakdown. */
export function renderReport(fixture: Fixture, result: SeasonResult): string {
  const runners = new Map(fixture.runners.map((r) => [r.id, r]));
  const name = (id: string) => runners.get(id)?.name ?? id;
  const activities = new Map<string, Activity>(fixture.activities.map((a) => [a.id, a]));
  const out: string[] = [];

  out.push(`# ${fixture.crewName}: season report`);
  out.push('');
  out.push(
    `Season \`${result.seasonId}\` from ${fixture.season.startDate}, rules ${result.rulesVersion}, as of ${fixture.asOf}.`,
  );
  out.push('');
  out.push('## Runners');
  out.push('');
  out.push('| Runner | Who | Baseline |');
  out.push('| --- | --- | --- |');
  for (const r of fixture.runners) {
    out.push(`| ${r.name} | ${r.persona ?? ''} | ${r.baselineKm} km, ${r.baselineRuns} runs |`);
  }
  out.push('');
  out.push('## Season standings');
  out.push('');
  out.push(...standingsTable(result.standings, name));

  for (const week of result.weeks) {
    out.push('');
    out.push(
      `## Week ${week.weekIndex + 1} (${week.startDate} to ${week.endDate}, ${week.status})`,
    );
    out.push('');
    if (week.bounty) out.push(`Bounty: **${week.bounty}**`, '');
    out.push('**Duels**');
    out.push('');
    for (const duel of week.duels) {
      const sides = duel.sides
        .map(
          (s) =>
            `${name(s.runnerId)} ${Math.round(s.kmPct)}%${s.completedOn ? ` (done ${s.completedOn})` : ''} → ${s.points}`,
        )
        .join(' vs ');
      out.push(`- ${sides}. ${duel.summary}`);
    }
    out.push('');
    out.push('**Week points**');
    out.push('');
    out.push('| Runner | Committed | Did | Show up | Word | Ambition | Duel | Bounty | Total |');
    out.push('| --- | --- | --- | --: | --: | --: | --: | --: | --: |');
    const byPoints = [...week.runners].sort((a, b) => b.points - a.points);
    for (const rw of byPoints) {
      const p = (rule: string) => rw.lines.find((l) => l.rule === rule)?.points ?? 0;
      const committed = `${rw.commitment.runs} runs, ${rw.commitment.km} km${rw.commitment.source === 'set' ? '' : ` (${rw.commitment.source})`}`;
      out.push(
        `| ${name(rw.runnerId)} | ${committed} | ${rw.runDays} runs, ${rw.km} km (${Math.round(rw.kmPct)}%) | ${p('show-up')} | ${p('keep-word')} | ${p('ambition')} | ${p('duel')} | ${p('bounty')} | **${rw.points}** |`,
      );
    }
    out.push('');
    out.push('**Standings after this week**');
    out.push('');
    out.push(...standingsTable(week.standings, name));
  }

  out.push('');
  out.push('## Breakdowns');
  for (const r of fixture.runners) {
    out.push('');
    out.push(`### ${r.name}`);
    for (const week of result.weeks) {
      const rw = week.runners.find((x) => x.runnerId === r.id);
      if (!rw) continue;
      out.push('');
      out.push(`**Week ${week.weekIndex + 1}: ${rw.points} points**`);
      out.push('');
      for (const line of rw.lines) {
        out.push(`- ${RULE_LABELS[line.rule]} **${line.points}**: ${line.reason}`);
      }
      if (rw.runs.length) {
        out.push('');
        out.push('| Date | Distance | Time | Pace | Source | Status |');
        out.push('| --- | --: | --: | --: | --- | --- |');
        for (const run of rw.runs) {
          const bounty = activities.get(run.activityId)?.bountyClaimed ? ' · bounty' : '';
          out.push(
            `| ${run.runDate} | ${(run.distanceM / 1000).toFixed(1)} km | ${duration(run.durationS)} | ${pace(run.durationS, run.distanceM)} | ${run.source} | ${STATUS_LABELS[run.status]}${bounty} |`,
          );
        }
      }
    }
  }
  return out.join('\n') + '\n';
}
