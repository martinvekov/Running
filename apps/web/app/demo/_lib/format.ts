const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** 2026-11-08 → "Sun 8 Nov". */
export function formatDay(date: string): string {
  return dayFormat.format(new Date(`${date}T12:00:00Z`));
}

/** 2026-11-02 → "2 Nov". */
export function formatShortDate(date: string): string {
  return formatDay(date).replace(/^\w+ /, '');
}

export function formatKm(km: number): string {
  return `${(Math.round(km * 10) / 10).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Minutes per km, e.g. "5:15 /km". Display only; pace never affects points. */
export function formatPace(durationS: number, distanceM: number): string {
  if (!distanceM) return '–';
  const s = Math.round(durationS / (distanceM / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /km`;
}

export const RULE_LABELS: Record<string, string> = {
  'show-up': 'Show up',
  'keep-word': 'Kept your word',
  ambition: 'Ambition',
  duel: 'Duel',
  bounty: 'Bounty',
};

export const RUN_STATUS: Record<string, { label: string; tone: 'ok' | 'muted' | 'warn' }> = {
  counted: { label: 'Counted', tone: 'ok' },
  'km-only': { label: 'Km only', tone: 'muted' },
  'too-short': { label: 'Too short', tone: 'warn' },
  'logged-late': { label: 'Logged late', tone: 'warn' },
};
