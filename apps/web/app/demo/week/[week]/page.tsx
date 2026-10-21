import type { Metadata } from 'next';
import { demoView } from '../../../_season/data';
import { WeekScreen } from '../../../_season/pages';

export function generateStaticParams() {
  return demoView.result.weeks.map((w) => ({ week: String(w.weekIndex + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  return { title: `Week ${week} · Crew Seasons` };
}

export default async function DemoWeekPage({ params }: { params: Promise<{ week: string }> }) {
  return <WeekScreen view={demoView} weekParam={(await params).week} />;
}
