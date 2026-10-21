import type { Metadata } from 'next';
import { demoView } from '../../../_season/data';
import { RunnerScreen } from '../../../_season/pages';

export function generateStaticParams() {
  return demoView.runners.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `${demoView.runnerName(id)} · Crew Seasons` };
}

export default async function DemoRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  return <RunnerScreen view={demoView} id={(await params).id} />;
}
