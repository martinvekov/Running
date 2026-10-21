-- Strava connections. A run imported from Strava is still an ordinary activities row with
-- source = 'strava', so the engine treats it like any other run.

create table public.strava_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

alter table public.strava_connections enable row level security;

-- You can see that you are connected, and disconnect. The tokens stay with the server: the
-- signed-in role is only granted the two harmless columns, so reading a token fails outright.
revoke all on public.strava_connections from anon, authenticated;
grant select (user_id, connected_at, last_synced_at) on public.strava_connections to authenticated;
grant delete on public.strava_connections to authenticated;
grant all on public.strava_connections to service_role;

create policy strava_connections_select_own on public.strava_connections
  for select to authenticated using (user_id = auth.uid());
create policy strava_connections_delete_own on public.strava_connections
  for delete to authenticated using (user_id = auth.uid());

-- Manual runs are stamped with the server's clock, as before. An imported run keeps the time the
-- run was recorded on Strava (never later than now), because the server may only fetch it
-- after the 48-hour window if nobody opened the app. Only the server can write source 'strava'.
create or replace function public.stamp_created_at() returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'activities' and new.source = 'strava' then
    new.created_at := least(coalesce(new.created_at, now()), now());
  else
    new.created_at := now();
  end if;
  return new;
end;
$$;
