import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StandingsScreen } from '@/app/_season/pages';
import { getSeasonView } from '@/lib/season-data';

export const metadata: Metadata = { title: 'Standings · Crew Seasons' };
export const dynamic = 'force-dynamic';

export default async function CrewStandingsPage({
  params,
}: {
  params: Promise<{ crewId: string }>;
}) {
  const { crewId } = await params;
  const view = await getSeasonView(crewId);
  if (!view) redirect(`/c/${crewId}/crew`);
  return <StandingsScreen view={view} />;
}
