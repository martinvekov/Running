import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RunScreen } from '@/app/_season/pages';
import { getSeasonView } from '@/lib/season-data';

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
  return <RunScreen view={view} id={id} />;
}
