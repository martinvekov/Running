import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WeekScreen } from '@/app/_season/pages';
import { getSeasonView } from '@/lib/season-data';

export const metadata: Metadata = { title: 'Week · Crew Seasons' };
export const dynamic = 'force-dynamic';

export default async function CrewWeekPage({
  params,
}: {
  params: Promise<{ crewId: string; week: string }>;
}) {
  const { crewId, week } = await params;
  const view = await getSeasonView(crewId);
  if (!view) redirect(`/c/${crewId}/crew`);
  return <WeekScreen view={view} weekParam={week} />;
}
