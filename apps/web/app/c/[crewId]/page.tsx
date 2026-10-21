import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FeedScreen } from '@/app/_season/pages';
import { NotConnected } from '@/components/not-connected';
import { getSeasonView } from '@/lib/season-data';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Feed · Crew Seasons' };
export const dynamic = 'force-dynamic';

export default async function CrewFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ crewId: string }>;
  searchParams: Promise<{ earlier?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { crewId } = await params;
  const earlier = Math.min(Math.max(Number((await searchParams).earlier) || 0, 0), 500);
  const view = await getSeasonView(crewId);
  if (!view) redirect(`/c/${crewId}/crew`);
  return <FeedScreen view={view} {...(earlier ? { earlier } : {})} />;
}
