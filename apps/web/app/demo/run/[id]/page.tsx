import type { Metadata } from 'next';
import { demoView } from '../../../_season/data';
import { formatKm } from '../../../_season/format';
import { RunScreen } from '../../../_season/pages';

export function generateStaticParams() {
  return [...demoView.runContexts.keys()].map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const ctx = demoView.runContexts.get((await params).id);
  if (!ctx) return {};
  return {
    title: `${demoView.runnerName(ctx.runnerId)} · ${formatKm(ctx.run.distanceM / 1000)} · Crew Seasons`,
  };
}

export default async function DemoRunPage({ params }: { params: Promise<{ id: string }> }) {
  return <RunScreen view={demoView} id={(await params).id} />;
}
