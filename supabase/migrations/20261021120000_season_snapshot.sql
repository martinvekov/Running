-- One call that hands the app everything the scoring engine needs for a season.
-- Runs with the caller's rights (security invoker), so Row Level Security decides what comes back:
-- someone outside the crew gets a null season and empty lists.

create function public.season_snapshot(p_season uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'season', (
      select jsonb_build_object(
        'id', s.id, 'crew_id', s.crew_id, 'number', s.number,
        'start_date', s.start_date, 'status', s.status, 'rules_version', s.rules_version)
      from public.seasons s where s.id = p_season
    ),
    'runners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sm.user_id, 'name', p.display_name,
        'baselineKm', sm.baseline_km, 'baselineRuns', sm.baseline_runs)
        order by p.display_name, sm.user_id)
      from public.season_members sm
      join public.profiles p on p.id = sm.user_id
      where sm.season_id = p_season
    ), '[]'::jsonb),
    'commitments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'runnerId', w.user_id, 'weekIndex', w.week_index,
        'km', w.planned_km, 'runs', w.planned_runs, 'committedAt', w.committed_at)
        order by w.committed_at, w.id)
      from public.weekly_plans w
      where w.season_id = p_season
    ), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'runnerId', a.user_id, 'source', a.source, 'runDate', a.run_date,
        'durationS', a.duration_s, 'distanceM', a.distance_m, 'loggedAt', a.created_at,
        'linkUrl', a.link_url, 'bountyClaimed', a.bounty_claimed_week is not null)
        order by a.run_date, a.created_at, a.id)
      from public.activities a
      join public.season_members sm on sm.user_id = a.user_id and sm.season_id = p_season
      join public.seasons s on s.id = p_season
      where a.run_date >= s.start_date and a.run_date < s.start_date + 21
    ), '[]'::jsonb),
    'bounties', coalesce((
      select jsonb_agg(jsonb_build_object('weekIndex', b.week_index, 'title', b.title)
        order by b.week_index)
      from public.bounties b
      where b.season_id = p_season
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.season_snapshot(uuid) from public;
grant execute on function public.season_snapshot(uuid) to authenticated;
