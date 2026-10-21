// Strava helpers that touch no network: building the sign-in link and turning a Strava activity
// into the fields a run row stores. Only date, time, distance and a link are kept: no map,
// location, heart rate or other health data (brief rule 6).

export const STRAVA_SCOPE = 'activity:read';

export function stravaAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const q = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_SCOPE,
    state: opts.state,
  });
  return `https://www.strava.com/oauth/authorize?${q.toString()}`;
}

/** A Strava activity, reduced to what we read. */
export interface StravaActivity {
  id: number;
  sport_type?: string;
  type?: string;
  start_date?: string;
  start_date_local?: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
}

export interface ImportedRun {
  sourceRef: string;
  runDate: string;
  durationS: number;
  distanceM: number;
  linkUrl: string;
  /** When the run ended, which is when it counts as logged. */
  recordedAt: string;
}

const RUN_TYPES = new Set(['Run', 'TrailRun']);

/** A running activity as a run row, or null for anything else (rides, walks, junk). */
export function mapStravaActivity(a: StravaActivity): ImportedRun | null {
  const sport = a.sport_type ?? a.type;
  if (!sport || !RUN_TYPES.has(sport)) return null;
  if (!Number.isInteger(a.id) || a.id <= 0) return null;
  const local = a.start_date_local?.slice(0, 10);
  if (!local || !/^\d{4}-\d{2}-\d{2}$/.test(local)) return null;
  const start = a.start_date ? Date.parse(a.start_date) : NaN;
  if (Number.isNaN(start)) return null;
  const durationS = Math.round(a.moving_time ?? 0);
  const distanceM = Math.round(a.distance ?? 0);
  if (durationS < 1 || durationS > 86_400 || distanceM < 0 || distanceM > 300_000) return null;
  const elapsed = Math.max(a.elapsed_time ?? durationS, durationS);
  return {
    sourceRef: String(a.id),
    runDate: local,
    durationS,
    distanceM,
    linkUrl: `https://www.strava.com/activities/${a.id}`,
    recordedAt: new Date(start + elapsed * 1000).toISOString(),
  };
}

/** True when the access token has expired or is about to. */
export function tokenNeedsRefresh(expiresAt: string | Date, now: number): boolean {
  return new Date(expiresAt).getTime() - now < 60_000;
}

/** Sync a connection at most this often, so opening the app does not hammer Strava. */
export const SYNC_INTERVAL_MS = 10 * 60_000;
