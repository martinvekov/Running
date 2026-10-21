import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RunnerScreen } from '@/app/_season/pages';
import { getSeasonView } from '@/lib/season-data';

export const metadata: Metadata = { title: 'Runner · Crew Seasons' };
export const dynamic = 'force-dynamic';

export default async function CrewRunnerPage({
  params,
}: {
  params: Promise<{ crewId: string; id: string }>;
}) {
  const { crewId, id } = await params;
  const view = await getSeasonView(crewId);
  if (!view) redirect(`/c/${crewId}/crew`);
  return <RunnerScreen view={view} id={id} />;
}
