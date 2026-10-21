import { cache } from 'react';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import type { Activity, Bounty, Commitment, Runner, SeasonInput } from '@crew/engine';
import { buildSeasonView, type OutsideRun, type SeasonView } from '@/app/_season/view';
import { requireUserId } from './auth';
import { adminClient, syncStrava } from './strava-sync';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SeasonRow {
  id: string;
  number: number;
  start_date: string;
  status: 'setup' | 'active' | 'closed';
  rules_version: string;
}

export interface CrewMemberRow {
  user_id: string;
  role: 'organiser' | 'member';
  profiles: { display_name: string } | { display_name: string }[] | null;
}

/** A crew member's display name. */
export function memberName(m: CrewMemberRow): string {
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return p?.display_name ?? 'Runner';
}

interface Snapshot {
  season: (SeasonRow & { crew_id: string }) | null;
  runners: Runner[];
  commitments: Commitment[];
  activities: (Omit<Activity, 'linkUrl'> & { linkUrl: string | null })[];
  bounties: Bounty[];
}

/** What `season_snapshot` returns, shaped for the scoring engine. `asOf` is the server's clock. */
export function snapshotToInput(snapshot: Snapshot, asOf: string): SeasonInput | null {
  const s = snapshot.season;
  if (!s) return null;
  return {
    season: { id: s.id, startDate: s.start_date, rulesVersion: s.rules_version },
    runners: snapshot.runners,
    commitments: snapshot.commitments,
    activities: snapshot.activities.map(({ linkUrl, ...a }) => (linkUrl ? { ...a, linkUrl } : a)),
    bounties: snapshot.bounties,
    asOf,
  };
}

/** The signed-in user, their crew and its latest season. Not found if they aren't in the crew. */
export const getCrewContext = cache(async (crewId: string) => {
  if (!UUID.test(crewId)) notFound();
  const { supabase, user } = await requireUserId(`/c/${crewId}`);
  // Row Level Security means a non-member gets nothing back, which reads as "not found".
  const [{ data: crew }, { data: seasons }, { data: members }] = await Promise.all([
    supabase
      .from('crews')
      .select('id, name, invite_code, organiser_id')
      .eq('id', crewId)
      .maybeSingle(),
    supabase
      .from('seasons')
      .select('id, number, start_date, status, rules_version')
      .eq('crew_id', crewId)
      .order('number', { ascending: false })
      .limit(1),
    supabase
      .from('crew_members')
      .select('user_id, role, profiles(display_name)')
      .eq('crew_id', crewId)
      .order('joined_at'),
  ]);
  if (!crew) notFound();
  const season = ((seasons ?? [])[0] ?? null) as SeasonRow | null;
  return {
    supabase,
    user,
    crew: crew as { id: string; name: string; invite_code: string; organiser_id: string },
    season,
    members: (members ?? []) as CrewMemberRow[],
    isOrganiser: crew.organiser_id === user.id,
  };
});

/** The crew's latest season, scored by the engine as of now. Null until a season has started. */
export const getSeasonView = cache(async (crewId: string): Promise<SeasonView | null> => {
  const { supabase, crew, season } = await getCrewContext(crewId);
  if (!season || season.status === 'setup') return null;
  // New Strava runs are fetched after the page has been sent, so a slow Strava never holds up
  // a tap. They show on the next view.
  if (season.status === 'active') after(() => syncSeasonStrava(season));
  const [{ data }, { outsideRuns, otherNames }] = await Promise.all([
    supabase.rpc('season_snapshot', { p_season: season.id }),
    loadOutsideRuns(crewId),
  ]);
  const input = snapshotToInput(data as Snapshot, new Date().toISOString());
  if (!input) return null;
  return buildSeasonView(input, {
    base: `/c/${crewId}`,
    crewName: crew.name,
    seasonNumber: season.number,
    outsideRuns,
    otherNames,
  });
});

/** Pull in any new Strava runs for the people in this season, at most every ten minutes each. */
async function syncSeasonStrava(season: SeasonRow) {
  const admin = adminClient();
  if (!admin) return;
  try {
    const { data } = await admin
      .from('season_members')
      .select('user_id')
      .eq('season_id', season.id);
    await syncStrava(
      (data ?? []).map((m) => m.user_id as string),
      season.start_date,
    );
  } catch {
    // The feed still renders from what is already saved.
  }
}

const OUTSIDE_RUN_LIMIT = 200;

/**
 * Every run the crew has logged, most recent first, that the season's scoring window does not
 * include. Row Level Security gives you your own runs and your crew mates'. They are shown in
 * the feed but never scored.
 */
async function loadOutsideRuns(crewId: string) {
  const { supabase, members } = await getCrewContext(crewId);
  const otherNames: Record<string, string> = {};
  for (const m of members) otherNames[m.user_id] = memberName(m);
  const ids = Object.keys(otherNames);
  if (ids.length === 0) return { outsideRuns: [] as OutsideRun[], otherNames };

  const { data } = await supabase
    .from('activities')
    .select('id, user_id, source, run_date, duration_s, distance_m, link_url, created_at')
    .in('user_id', ids)
    .order('run_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(OUTSIDE_RUN_LIMIT);
  // Runs inside the season are dropped when the view is built.
  const outsideRuns: OutsideRun[] = (data ?? []).map((a) => ({
    id: a.id as string,
    runnerId: a.user_id as string,
    source: a.source as 'manual' | 'strava',
    runDate: a.run_date as string,
    durationS: a.duration_s as number,
    distanceM: a.distance_m as number,
    loggedAt: a.created_at as string,
    ...(a.link_url ? { linkUrl: a.link_url as string } : {}),
  }));
  return { outsideRuns, otherNames };
}
