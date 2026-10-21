import { addDays } from '@crew/engine';

// Reading and checking what people type into the season forms. The database re-checks all of it;
// this is for friendly messages. None of it computes points.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isMonday(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
}

/** The next `count` Mondays after `today` (a London date), the earliest a season can start. */
export function upcomingMondays(today: string, count = 6): string[] {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const first = addDays(today, (8 - dow) % 7 || 7);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

export function parseStartDate(input: unknown): string | null {
  return isIsoDate(input) && isMonday(input) ? input : null;
}

export const MAX_BOUNTY_LENGTH = 80;

/** Bounty titles, one per week; blank entries are dropped. Returns null if any is too long. */
export function parseBounties(inputs: unknown[]): (string | null)[] | null {
  const out: (string | null)[] = [];
  for (const input of inputs) {
    const text = typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : '';
    if (text.length > MAX_BOUNTY_LENGTH) return null;
    out.push(text === '' ? null : text);
  }
  return out;
}

/** A number typed as 12, 12.5 or 12,5. */
export function parseNumber(input: unknown): number | null {
  if (typeof input !== 'string') return null;
  const text = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function parseBaseline(km: unknown, runs: unknown): { km: number; runs: number } | null {
  const k = parseNumber(km);
  const r = parseNumber(runs);
  if (k === null || r === null) return null;
  const kmRounded = Math.round(k * 10) / 10;
  if (kmRounded <= 0 || kmRounded > 500 || !Number.isInteger(r) || r < 1 || r > 14) return null;
  return { km: kmRounded, runs: r };
}

/** Time as `42`, `42:30` (min:sec) or `1:05:10` (h:min:sec). Returns seconds. */
export function parseDuration(input: unknown): number | null {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  let seconds: number;
  if (/^\d+(\.\d+)?$/.test(text.replace(',', '.'))) {
    seconds = Math.round(Number(text.replace(',', '.')) * 60);
  } else {
    const parts = text.split(':');
    if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d{1,2}$/.test(p))) {
      return null;
    }
    const nums = parts.map(Number) as number[];
    if (nums.slice(1).some((n) => n > 59)) return null;
    seconds =
      nums.length === 2 ? nums[0]! * 60 + nums[1]! : nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  }
  return seconds >= 1 && seconds <= 86_400 ? seconds : null;
}

export interface RunForm {
  runDate: string;
  distanceM: number;
  durationS: number;
  linkUrl: string | null;
  bounty: boolean;
}

export type RunFormError = 'date' | 'distance' | 'time' | 'link' | 'future' | 'outside';

/** A run typed into the log form. `today` is the London date; `start`..`end` bound the season. */
export function parseRun(
  fields: { date: unknown; km: unknown; time: unknown; link: unknown; bounty: unknown },
  window: { today: string; start: string; end: string },
): { ok: true; run: RunForm } | { ok: false; error: RunFormError } {
  if (!isIsoDate(fields.date)) return { ok: false, error: 'date' };
  if (fields.date > window.today) return { ok: false, error: 'future' };
  if (fields.date < window.start || fields.date > window.end)
    return { ok: false, error: 'outside' };
  const km = parseNumber(fields.km);
  if (km === null || km < 0.1 || km > 300) return { ok: false, error: 'distance' };
  const durationS = parseDuration(fields.time);
  if (durationS === null) return { ok: false, error: 'time' };
  let linkUrl: string | null = null;
  if (typeof fields.link === 'string' && fields.link.trim() !== '') {
    const link = fields.link.trim();
    if (!/^https?:\/\/\S+$/i.test(link) || link.length > 500) return { ok: false, error: 'link' };
    linkUrl = link;
  }
  return {
    ok: true,
    run: {
      runDate: fields.date,
      distanceM: Math.round(km * 1000),
      durationS,
      linkUrl,
      bounty: fields.bounty === 'on',
    },
  };
}
