-- Crew Seasons: initial schema and access rules.
--
-- Three boundaries hold here (docs/brief.md):
--   1. Every run is one canonical `activities` row with a `source`.
--   2. Points are never source data. `week_results` is a cache only the engine's job writes.
--   3. Access is enforced by Row Level Security, not by the app. Every table has policies and
--      each policy has a test in supabase/tests/policies.test.ts.
--
-- Only the fields in the brief are stored: no location, GPS, heart rate or other health data.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- An organiser must hand over or delete their crew before their account can be deleted.
  organiser_id uuid not null references public.profiles (id) on delete restrict,
  -- Random and revocable: rotate_invite_code() replaces it.
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('organiser', 'member')),
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index crew_members_user_idx on public.crew_members (user_id);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  number integer not null check (number > 0),
  -- Seasons start on a Monday; week boundaries themselves are Europe/London (engine).
  start_date date not null check (extract(isodow from start_date) = 1),
  rules_version text not null default 'v1',
  status text not null default 'setup' check (status in ('setup', 'active', 'closed')),
  created_at timestamptz not null default now(),
  unique (crew_id, number)
);

create table public.season_members (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  baseline_km numeric(6, 1) not null check (baseline_km > 0 and baseline_km <= 500),
  baseline_runs integer not null check (baseline_runs between 1 and 14),
  primary key (season_id, user_id)
);
create index season_members_user_idx on public.season_members (user_id);

-- The weekly commitment. Append-only: a later row supersedes an earlier one, and the engine
-- picks the latest valid commitment made before the Sunday 23:59 deadline.
create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_index integer not null check (week_index between 0 and 2),
  planned_km numeric(6, 1) not null check (planned_km > 0 and planned_km <= 700),
  planned_runs integer not null check (planned_runs between 1 and 14),
  committed_at timestamptz not null default now()
);
create index weekly_plans_lookup_idx on public.weekly_plans (season_id, user_id, week_index);

-- The canonical run. `created_at` is when the run reached us, which is the engine's logging time.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('manual', 'strava')),
  source_ref text,
  run_date date not null,
  duration_s integer not null check (duration_s > 0 and duration_s <= 86400),
  distance_m integer not null check (distance_m >= 0 and distance_m <= 300000),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  bounty_claimed_week integer check (bounty_claimed_week between 0 and 2),
  created_at timestamptz not null default now()
);
create index activities_user_date_idx on public.activities (user_id, run_date);
create unique index activities_source_ref_idx
  on public.activities (user_id, source, source_ref) where source_ref is not null;

create table public.bounties (
  season_id uuid not null references public.seasons (id) on delete cascade,
  week_index integer not null check (week_index between 0 and 2),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  primary key (season_id, week_index)
);

-- Append-only log of what happened in a crew. Reactions are events too.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  season_id uuid references public.seasons (id) on delete cascade,
  type text not null check (
    type in (
      'run_logged', 'plan_set', 'overtake', 'reaction', 'recap_shared', 'season_started',
      'member_joined'
    )
  ),
  actor_id uuid references public.profiles (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_crew_idx on public.events (crew_id, created_at desc);

-- Engine output cache. Safe to delete and rebuild; only the engine's job writes it.
create table public.week_results (
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_index integer not null check (week_index between 0 and 2),
  points_total integer not null,
  breakdown jsonb not null,
  rules_version text not null,
  computed_at timestamptz not null default now(),
  primary key (season_id, user_id, week_index)
);

-- ---------------------------------------------------------------------------------------------
-- Helper functions
--
-- Policies need to ask "is this user in that crew?" about tables that are themselves protected.
-- These run as the function owner so the question can be answered without recursing into the
-- policies, and they only ever answer about the signed-in user (auth.uid()).
-- ---------------------------------------------------------------------------------------------

create function public.is_crew_member(p_crew uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.crew_members m where m.crew_id = p_crew and m.user_id = auth.uid()
  );
$$;

create function public.is_crew_organiser(p_crew uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.crews c where c.id = p_crew and c.organiser_id = auth.uid()
  );
$$;

create function public.shares_crew_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.crew_members mine
    join public.crew_members theirs on theirs.crew_id = mine.crew_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user
  );
$$;

create function public.season_crew(p_season uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select s.crew_id from public.seasons s where s.id = p_season;
$$;

create function public.season_status(p_season uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.status from public.seasons s where s.id = p_season;
$$;

create function public.is_season_member(p_season uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.season_members m where m.season_id = p_season and m.user_id = p_user
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------------------------

-- Anyone signed in can start a crew and becomes its organiser.
create function public.create_crew(p_name text) returns public.crews
language plpgsql security definer set search_path = '' as $$
declare
  v_crew public.crews;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.crews (name, organiser_id) values (p_name, auth.uid()) returning * into v_crew;
  insert into public.crew_members (crew_id, user_id, role) values (v_crew.id, auth.uid(), 'organiser');
  return v_crew;
end;
$$;

-- A non-member cannot look a crew up, so joining goes through the invite code here.
create function public.join_crew(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_crew uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select c.id into v_crew from public.crews c where c.invite_code = p_code;
  if v_crew is null then
    raise exception 'invalid invite code' using errcode = 'P0002';
  end if;
  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew, auth.uid(), 'member')
  on conflict (crew_id, user_id) do nothing;
  return v_crew;
end;
$$;

-- Revoking an invite replaces its code; the old link stops working.
create function public.rotate_invite_code(p_crew uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_crew_organiser(p_crew) then
    raise exception 'only the organiser can do that' using errcode = '42501';
  end if;
  update public.crews set invite_code = v_code where id = p_crew;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

-- A profile appears when someone signs up; they set their display name on first visit.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
        'Runner'
      ),
      40
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The server's clock decides when a run was logged and when a commitment was made. The engine's
-- 48-hour logging window and Sunday 23:59 deadline depend on it, so a client cannot choose it.
create function public.stamp_created_at() returns trigger
language plpgsql as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger activities_stamp
  before insert on public.activities
  for each row execute function public.stamp_created_at();

create function public.stamp_committed_at() returns trigger
language plpgsql as $$
begin
  new.committed_at := now();
  return new;
end;
$$;

create trigger weekly_plans_stamp
  before insert on public.weekly_plans
  for each row execute function public.stamp_committed_at();

-- Rules and dates are frozen once a season starts, and a season only moves forward.
create function public.guard_season_update() returns trigger
language plpgsql as $$
begin
  if old.status <> 'setup' then
    if new.start_date <> old.start_date
       or new.rules_version <> old.rules_version
       or new.number <> old.number
       or new.crew_id <> old.crew_id then
      raise exception 'season is frozen once it has started' using errcode = 'P0001';
    end if;
  end if;
  if (old.status = 'active' and new.status = 'setup')
     or (old.status = 'closed' and new.status <> 'closed') then
    raise exception 'a season only moves forward: setup, active, closed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger seasons_guard
  before update on public.seasons
  for each row execute function public.guard_season_update();

-- ---------------------------------------------------------------------------------------------
-- Privileges: nothing for the anonymous role; the signed-in role gets only what a policy uses.
-- Row Level Security below decides which rows.
-- ---------------------------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, update, delete on public.crews to authenticated;
grant select, delete on public.crew_members to authenticated;
grant select, insert, update, delete on public.seasons to authenticated;
grant select, insert, update, delete on public.season_members to authenticated;
grant select, insert on public.weekly_plans to authenticated;
grant select, insert, delete on public.activities to authenticated;
grant select, insert, update, delete on public.bounties to authenticated;
grant select, insert on public.events to authenticated;
grant select on public.week_results to authenticated;

grant all on all tables in schema public to service_role;

grant execute on function
  public.is_crew_member(uuid),
  public.is_crew_organiser(uuid),
  public.shares_crew_with(uuid),
  public.season_crew(uuid),
  public.season_status(uuid),
  public.is_season_member(uuid, uuid),
  public.create_crew(text),
  public.join_crew(text),
  public.rotate_invite_code(uuid)
to authenticated;

grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.seasons enable row level security;
alter table public.season_members enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.activities enable row level security;
alter table public.bounties enable row level security;
alter table public.events enable row level security;
alter table public.week_results enable row level security;

-- profiles: you, and the people you share a crew with. Created by trigger, edited by you.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_crew_with(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- crews: members read. Created through create_crew(); the organiser renames or deletes.
create policy crews_select on public.crews for select to authenticated
  using (public.is_crew_member(id));
create policy crews_update on public.crews for update to authenticated
  using (organiser_id = auth.uid()) with check (organiser_id = auth.uid());
create policy crews_delete on public.crews for delete to authenticated
  using (organiser_id = auth.uid());

-- crew_members: members read. Joined through join_crew(). A member can leave; the organiser can
-- remove members but cannot abandon the crew.
create policy crew_members_select on public.crew_members for select to authenticated
  using (public.is_crew_member(crew_id));
create policy crew_members_delete on public.crew_members for delete to authenticated
  using (
    role = 'member'
    and (user_id = auth.uid() or public.is_crew_organiser(crew_id))
  );

-- seasons: members read; only the organiser creates, changes (see guard) or deletes in setup.
create policy seasons_select on public.seasons for select to authenticated
  using (public.is_crew_member(crew_id));
create policy seasons_insert on public.seasons for insert to authenticated
  with check (public.is_crew_organiser(crew_id) and status = 'setup');
create policy seasons_update on public.seasons for update to authenticated
  using (public.is_crew_organiser(crew_id)) with check (public.is_crew_organiser(crew_id));
create policy seasons_delete on public.seasons for delete to authenticated
  using (public.is_crew_organiser(crew_id) and status = 'setup');

-- season_members: members read. You enter and edit your own baseline, but only while the season
-- is in setup: baselines are frozen once it starts.
create policy season_members_select on public.season_members for select to authenticated
  using (public.is_crew_member(public.season_crew(season_id)));
create policy season_members_insert on public.season_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_crew_member(public.season_crew(season_id))
    and public.season_status(season_id) = 'setup'
  );
create policy season_members_update on public.season_members for update to authenticated
  using (user_id = auth.uid() and public.season_status(season_id) = 'setup')
  with check (user_id = auth.uid() and public.season_status(season_id) = 'setup');
create policy season_members_delete on public.season_members for delete to authenticated
  using (
    public.season_status(season_id) = 'setup'
    and (user_id = auth.uid() or public.is_crew_organiser(public.season_crew(season_id)))
  );

-- weekly_plans: the crew reads everyone's commitments. You add your own, never change or remove.
create policy weekly_plans_select on public.weekly_plans for select to authenticated
  using (public.is_crew_member(public.season_crew(season_id)));
create policy weekly_plans_insert on public.weekly_plans for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_season_member(season_id, auth.uid())
    and public.season_status(season_id) in ('setup', 'active')
  );

-- activities: you and your crew mates read. You log manual runs and can delete your own (to
-- correct one, delete and log it again: the logging time restarts, so the 48-hour window holds).
-- Strava runs are written by the server only.
create policy activities_select on public.activities for select to authenticated
  using (user_id = auth.uid() or public.shares_crew_with(user_id));
create policy activities_insert on public.activities for insert to authenticated
  with check (user_id = auth.uid() and source = 'manual');
create policy activities_delete on public.activities for delete to authenticated
  using (user_id = auth.uid() and source = 'manual');

-- bounties: members read; the organiser sets them.
create policy bounties_select on public.bounties for select to authenticated
  using (public.is_crew_member(public.season_crew(season_id)));
create policy bounties_insert on public.bounties for insert to authenticated
  with check (public.is_crew_organiser(public.season_crew(season_id)));
create policy bounties_update on public.bounties for update to authenticated
  using (public.is_crew_organiser(public.season_crew(season_id)))
  with check (public.is_crew_organiser(public.season_crew(season_id)));
create policy bounties_delete on public.bounties for delete to authenticated
  using (public.is_crew_organiser(public.season_crew(season_id)));

-- events: members read and add their own; nobody edits or deletes.
create policy events_select on public.events for select to authenticated
  using (public.is_crew_member(crew_id));
create policy events_insert on public.events for insert to authenticated
  with check (
    actor_id = auth.uid()
    and public.is_crew_member(crew_id)
    and (season_id is null or public.season_crew(season_id) = crew_id)
  );

-- week_results: members read. Written only by the engine's job (service role).
create policy week_results_select on public.week_results for select to authenticated
  using (public.is_crew_member(public.season_crew(season_id)));
