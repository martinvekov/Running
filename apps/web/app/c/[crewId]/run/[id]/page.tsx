import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PastRunScreen, RunScreen } from '@/app/_season/pages';
import { CommentThread, type CommentRow } from '@/app/_season/run-social';
import { getCrewContext, getSeasonView } from '@/lib/season-data';

export const metadata: Metadata = { title: 'Run · Crew Seasons' };
export const dynamic = 'force-dynamic';

export default async function CrewRunPage({
  params,
}: {
  params: Promise<{ crewId: string; id: string }>;
}) {
  const { crewId, id } = await params;
  const view = await getSeasonView(crewId);
  if (!view) redirect(`/c/${crewId}/crew`);
  const known = view.runContexts.has(id) || view.outsideRuns.some((r) => r.id === id);
  if (!known) notFound();

  const { supabase } = await getCrewContext(crewId);
  const { data } = await supabase
    .from('run_comments')
    .select('id, user_id, body, created_at, profiles(display_name)')
    .eq('activity_id', id)
    .order('created_at')
    .limit(200);
  const comments: CommentRow[] = (data ?? []).map((c) => {
    const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    return {
      id: c.id as string,
      user_id: c.user_id as string,
      body: c.body as string,
      created_at: c.created_at as string,
      name: (p?.display_name as string | undefined) ?? 'Runner',
    };
  });
  const thread = <CommentThread view={view} activityId={id} comments={comments} />;

  return view.runContexts.has(id) ? (
    <RunScreen view={view} id={id} footer={thread} />
  ) : (
    <PastRunScreen view={view} id={id} footer={thread} />
  );
}
