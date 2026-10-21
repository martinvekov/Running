'use server';

import { redirect } from 'next/navigation';
import { londonDate, rulesV1, validateCommitment } from '@crew/engine';
import { getCrewContext, getSeasonView } from '@/lib/season-data';
import {
  parseBaseline,
  parseBounties,
  parseNumber,
  parseRun,
  parseStartDate,
  upcomingMondays,
} from '@/lib/season-forms';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '');

function crewIdOf(formData: FormData): string {
  return text(formData, 'crewId');
}

/** Organiser: create the next season in setup, with its three bounties. */
export async function planSeason(formData: FormData) {
  const crewId = crewIdOf(formData);
  const back = (q: string) => `/c/${crewId}/crew?${q}`;
  const { supabase, season, isOrganiser } = await getCrewContext(crewId);
  if (!isOrganiser) redirect(back('error=organiser'));
  if (season && season.status !== 'closed') redirect(back('error=season-open'));

  const start = parseStartDate(text(formData, 'start'));
  if (!start || !upcomingMondays(londonDate(new Date().toISOString()), 8).includes(start)) {
    redirect(back('error=start'));
  }
  const bounties = parseBounties([0, 1, 2].map((i) => formData.get(`bounty${i}`)));
  if (!bounties) redirect(back('error=bounty'));

  const { data, error } = await supabase
    .from('seasons')
    .insert({ crew_id: crewId, number: (season?.number ?? 0) + 1, start_date: start })
    .select('id')
    .single();
  if (error || !data) redirect(back('error=save'));

  const rows = bounties.flatMap((title, weekIndex) =>
    title ? [{ season_id: data.id as string, week_index: weekIndex, title }] : [],
  );
  if (rows.length) {
    const { error: bountyError } = await supabase.from('bounties').insert(rows);
    if (bountyError) redirect(back('error=save'));
  }
  redirect(back('saved=season'));
}

/** Any member: set their own usual week while the season is in setup. */
export async function saveBaseline(formData: FormData) {
  const crewId = crewIdOf(formData);
  const back = (q: string) => `/c/${crewId}/crew?${q}`;
  const { supabase, user, season } = await getCrewContext(crewId);
  if (!season || season.status !== 'setup') redirect(back('error=started'));
  const baseline = parseBaseline(formData.get('km'), formData.get('runs'));
  if (!baseline) redirect(back('error=baseline'));
  const { error } = await supabase.from('season_members').upsert({
    season_id: season.id,
    user_id: user.id,
    baseline_km: baseline.km,
    baseline_runs: baseline.runs,
  });
  if (error) redirect(back('error=save'));
  redirect(back('saved=baseline'));
}

/** Organiser: start the season once at least two runners have set their usual week. */
export async function startSeason(formData: FormData) {
  const crewId = crewIdOf(formData);
  const back = (q: string) => `/c/${crewId}/crew?${q}`;
  const { supabase, season, isOrganiser } = await getCrewContext(crewId);
  if (!isOrganiser || !season || season.status !== 'setup') redirect(back('error=save'));
  const { count } = await supabase
    .from('season_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('season_id', season.id);
  if ((count ?? 0) < 2) redirect(back('error=few'));
  const { error } = await supabase.from('seasons').update({ status: 'active' }).eq('id', season.id);
  if (error) redirect(back('error=save'));
  redirect(`/c/${crewId}`);
}

/** Any season member: log a run by hand. */
export async function logRun(formData: FormData) {
  const crewId = crewIdOf(formData);
  const back = (q: string) => `/c/${crewId}/log?${q}`;
  const { supabase, user, season } = await getCrewContext(crewId);
  if (!season || season.status !== 'active') redirect(back('error=inactive'));

  const start = season.start_date;
  const end = new Date(Date.parse(`${start}T12:00:00Z`) + 20 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const parsed = parseRun(
    {
      date: formData.get('date'),
      km: formData.get('km'),
      time: formData.get('time'),
      link: formData.get('link'),
      bounty: formData.get('bounty'),
    },
    { today: londonDate(new Date().toISOString()), start, end },
  );
  if (!parsed.ok) redirect(back(`error=${parsed.error}`));
  const { run } = parsed;

  let bountyWeek: number | null = null;
  if (run.bounty) {
    const week = Math.floor(
      (Date.parse(`${run.runDate}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) /
        (7 * 86_400_000),
    );
    const view = await getSeasonView(crewId);
    if (view?.input.bounties.some((b) => b.weekIndex === week)) bountyWeek = week;
  }

  const { error } = await supabase.from('activities').insert({
    user_id: user.id,
    source: 'manual',
    run_date: run.runDate,
    duration_s: run.durationS,
    distance_m: run.distanceM,
    link_url: run.linkUrl,
    bounty_claimed_week: bountyWeek,
  });
  if (error) redirect(back('error=save'));
  redirect(back('saved=run'));
}

/** Delete one of your own manual runs (to correct it, delete it and log it again). */
export async function deleteRun(formData: FormData) {
  const crewId = crewIdOf(formData);
  const { supabase, user } = await getCrewContext(crewId);
  await supabase.from('activities').delete().eq('id', text(formData, 'id')).eq('user_id', user.id);
  redirect(`/c/${crewId}/log?saved=deleted`);
}

/** Any season member: make or change this week's commitment, before its Sunday 23:59 deadline. */
export async function setCommitment(formData: FormData) {
  const crewId = crewIdOf(formData);
  const back = (q: string) => `/c/${crewId}/log?${q}`;
  const { supabase, user, season } = await getCrewContext(crewId);
  const view = await getSeasonView(crewId);
  if (!season || !view || season.status !== 'active') redirect(back('error=inactive'));
  const runner = view.runnersById.get(user.id);
  if (!runner) redirect(back('error=not-member'));

  const weekIndex = Number(formData.get('week'));
  const week = view.result.weeks[weekIndex];
  if (!week || Date.parse(week.commitDeadline) < Date.now()) redirect(back('error=deadline'));

  const km = parseNumber(formData.get('km'));
  const runs = parseNumber(formData.get('runs'));
  if (km === null || runs === null) redirect(back(`error=commit&week=${weekIndex}`));
  const checked = validateCommitment(rulesV1, runner, { km, runs });
  if (!checked.ok) redirect(back(`error=commit&week=${weekIndex}`));

  const { error } = await supabase.from('weekly_plans').insert({
    season_id: season.id,
    user_id: user.id,
    week_index: weekIndex,
    planned_km: Math.round(km * 10) / 10,
    planned_runs: runs,
  });
  if (error) redirect(back('error=save'));
  redirect(back('saved=commitment'));
}
