import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  mapStravaActivity,
  SYNC_INTERVAL_MS,
  tokenNeedsRefresh,
  type StravaActivity,
} from './strava';

// Talks to Strava and writes imported runs. Runs on the server only: it needs the Supabase
// secret key and Strava's client secret, which never reach the browser.

const API = 'https://www.strava.com/api/v3';
const TIMEOUT_MS = 6000;

export function stravaConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Strava is switched on once its keys are in the environment. */
export function stravaAvailable(): boolean {
  return stravaConfig() !== null && adminClient() !== null;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse | null> {
  const config = stravaConfig();
  if (!config) return null;
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

/** Swap the one-time code from Strava's sign-in for tokens. */
export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: 'authorization_code' });
}

interface Connection {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function freshAccessToken(admin: SupabaseClient, conn: Connection): Promise<string | null> {
  if (!tokenNeedsRefresh(conn.expires_at, Date.now())) return conn.access_token;
  const t = await tokenRequest({ refresh_token: conn.refresh_token, grant_type: 'refresh_token' });
  if (!t) return null;
  await admin
    .from('strava_connections')
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: new Date(t.expires_at * 1000).toISOString(),
    })
    .eq('user_id', conn.user_id);
  return t.access_token;
}

/** Import one runner's Strava runs from `sinceDate` (a London date) onwards. Returns how many are new. */
async function importRuns(
  admin: SupabaseClient,
  conn: Connection,
  sinceDate: string,
  maxPages: number,
): Promise<number> {
  const token = await freshAccessToken(admin, conn);
  if (!token) return 0;
  const after = Math.floor(Date.parse(`${sinceDate}T00:00:00Z`) / 1000) - 86_400;

  const runs = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${API}/athlete/activities?after=${after}&per_page=100&page=${page}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) break;
    const batch = (await res.json()) as StravaActivity[];
    for (const a of batch) {
      const run = mapStravaActivity(a);
      if (run && run.runDate >= sinceDate) runs.push(run);
    }
    if (batch.length < 100) break;
  }
  if (runs.length === 0) return 0;

  const { data: existing } = await admin
    .from('activities')
    .select('source_ref')
    .eq('user_id', conn.user_id)
    .eq('source', 'strava')
    .in(
      'source_ref',
      runs.map((r) => r.sourceRef),
    );
  const have = new Set((existing ?? []).map((r) => r.source_ref as string));
  const fresh = runs.filter((r) => !have.has(r.sourceRef));
  if (fresh.length === 0) return 0;

  const { error } = await admin.from('activities').insert(
    fresh.map((r) => ({
      user_id: conn.user_id,
      source: 'strava',
      source_ref: r.sourceRef,
      run_date: r.runDate,
      duration_s: r.durationS,
      distance_m: r.distanceM,
      link_url: r.linkUrl,
      created_at: r.recordedAt,
    })),
  );
  // A run that another request imported a moment ago trips the unique index: nothing is lost.
  return error ? 0 : fresh.length;
}

/**
 * Bring Strava runs in for these runners. Unless `force` is set, a runner is skipped if they
 * were synced in the last ten minutes. Never throws: Strava being slow must not break the app.
 */
export async function syncStrava(
  userIds: string[],
  sinceDate: string,
  options: { force?: boolean; maxPages?: number } = {},
): Promise<void> {
  const admin = adminClient();
  if (!admin || !stravaConfig() || userIds.length === 0) return;
  const cutoff = new Date(Date.now() - SYNC_INTERVAL_MS).toISOString();

  await Promise.allSettled(
    userIds.map(async (userId) => {
      // Claim the sync first, so two people opening the app together do not both fetch.
      let claim = admin
        .from('strava_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (!options.force) claim = claim.or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`);
      const { data } = await claim
        .select('user_id, access_token, refresh_token, expires_at')
        .maybeSingle();
      if (data) await importRuns(admin, data as Connection, sinceDate, options.maxPages ?? 3);
    }),
  );
}
