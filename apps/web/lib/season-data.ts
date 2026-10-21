import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Activity, Bounty, Commitment, Runner, SeasonInput } from '@crew/engine';
import { buildSeasonView, type SeasonView } from '@/app/_season/view';
import { requireUser } from './auth';
import { adminClient, syncStrava } from './strava-sync';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SeasonRow {
  id: string;
  number: number;
  start_date: string;
  status: 'setup' | 'active' | 'closed';
  rules_version: string;
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
  const { supabase, user } = await requireUser(`/c/${crewId}`);
  // Row Level Security means a non-member gets nothing back, which reads as "not found".
  const { data: crew } = await supabase
    .from('crews')
    .select('id, name, invite_code, organiser_id')
    .eq('id', crewId)
    .maybeSingle();
  if (!crew) notFound();
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, number, start_date, status, rules_version')
    .eq('crew_id', crewId)
    .order('number', { ascending: false })
    .limit(1);
  const season = ((seasons ?? [])[0] ?? null) as SeasonRow | null;
  return {
    supabase,
    user,
    crew: crew as { id: string; name: string; invite_code: string; organiser_id: string },
    season,
    isOrganiser: crew.organiser_id === user.id,
  };
});

/** The crew's latest season, scored by the engine as of now. Null until a season has started. */
export const getSeasonView = cache(async (crewId: string): Promise<SeasonView | null> => {
  const { supabase, crew, season } = await getCrewContext(crewId);
  if (!season || season.status === 'setup') return null;
  if (season.status === 'active') await syncSeasonStrava(season);
  const { data } = await supabase.rpc('season_snapshot', { p_season: season.id });
  const input = snapshotToInput(data as Snapshot, new Date().toISOString());
  if (!input) return null;
  return buildSeasonView(input, {
    base: `/c/${crewId}`,
    crewName: crew.name,
    seasonNumber: season.number,
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
