import type { Instant, LocalDate } from './types';

// Pure Europe/London calendar helpers. Every function takes its inputs explicitly;
// nothing reads the current time.

const TIME_ZONE = 'Europe/London';
const DAY_MS = 86_400_000;

const londonParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function parts(ms: number) {
  const out: Record<string, number> = {};
  for (const p of londonParts.formatToParts(ms)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

function dateToUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function utcMsToDate(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function toMs(instant: Instant): number {
  const ms = Date.parse(instant);
  if (Number.isNaN(ms)) throw new Error(`Invalid instant: ${instant}`);
  return ms;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return utcMsToDate(dateToUtcMs(date) + days * DAY_MS);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((dateToUtcMs(to) - dateToUtcMs(from)) / DAY_MS);
}

export function isMonday(date: LocalDate): boolean {
  return new Date(dateToUtcMs(date)).getUTCDay() === 1;
}

/** The London calendar date an instant falls on. */
export function londonDate(instant: Instant): LocalDate {
  const p = parts(toMs(instant));
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** The instant at which London wall-clock time `time` (HH:MM) occurs on `date`. */
export function londonInstant(date: LocalDate, time: string): Instant {
  const [h, min] = time.split(':').map(Number) as [number, number];
  const wallMs = dateToUtcMs(date) + (h * 60 + min) * 60_000;
  // London is UTC or UTC+1. Guess UTC, then correct by the offset at that guess.
  let ms = wallMs;
  for (let i = 0; i < 2; i++) {
    const p = parts(ms);
    const seenMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    ms += wallMs - seenMs;
  }
  return new Date(ms).toISOString();
}

/** The last millisecond of the minute starting at `instant`, so "by 23:59" includes 23:59:59. */
export function endOfMinute(instant: Instant): Instant {
  return new Date(toMs(instant) + 59_999).toISOString();
}
