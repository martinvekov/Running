-- Likes and comments on runs. Both follow who can already see the run: you reach a run's likes
-- and comments only if you can see the run itself. You act only as yourself, and you can take
-- back your own like or comment. Comments are short, stamped by the server, and cannot be edited.

create function public.can_see_activity(p_activity uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activities a
    where a.id = p_activity and (a.user_id = auth.uid() or public.shares_crew_with(a.user_id))
  );
$$;

create table public.run_likes (
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table public.run_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index run_comments_activity_idx on public.run_comments (activity_id, created_at);

alter table public.run_likes enable row level security;
alter table public.run_comments enable row level security;

-- Only the columns a person chooses can be written; the id and the time come from the server.
revoke all on public.run_likes, public.run_comments from anon, authenticated;
grant select, delete on public.run_likes, public.run_comments to authenticated;
grant insert (activity_id, user_id) on public.run_likes to authenticated;
grant insert (activity_id, user_id, body) on public.run_comments to authenticated;
grant all on public.run_likes, public.run_comments to service_role;

create policy run_likes_select on public.run_likes for select to authenticated
  using (public.can_see_activity(activity_id));
create policy run_likes_insert on public.run_likes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_activity(activity_id));
create policy run_likes_delete on public.run_likes for delete to authenticated
  using (user_id = auth.uid());

create policy run_comments_select on public.run_comments for select to authenticated
  using (public.can_see_activity(activity_id));
create policy run_comments_insert on public.run_comments for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_activity(activity_id));
create policy run_comments_delete on public.run_comments for delete to authenticated
  using (user_id = auth.uid());

-- Likes, comment count and the latest comment for a list of runs, in one call. Runs the caller
-- cannot see are left out. Runs with the caller's rights, so Row Level Security applies.
create function public.run_social(p_activities uuid[]) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(a.id, jsonb_build_object(
    'likes', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', l.user_id, 'name', p.display_name)
        order by l.created_at, l.user_id), '[]'::jsonb)
      from public.run_likes l join public.profiles p on p.id = l.user_id
      where l.activity_id = a.id
    ),
    'commentCount', (select count(*) from public.run_comments c where c.activity_id = a.id),
    'latest', (
      select jsonb_build_object('id', c.id, 'userId', c.user_id, 'name', p.display_name,
        'body', c.body, 'createdAt', c.created_at)
      from public.run_comments c join public.profiles p on p.id = c.user_id
      where c.activity_id = a.id
      order by c.created_at desc, c.id desc
      limit 1
    )
  )), '{}'::jsonb)
  from public.activities a
  where a.id = any (p_activities);
$$;

revoke all on function public.can_see_activity(uuid), public.run_social(uuid[]) from public, anon;
grant execute on function public.can_see_activity(uuid), public.run_social(uuid[]) to authenticated;
