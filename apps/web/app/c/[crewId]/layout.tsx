import type { ReactNode } from 'react';
import { TabBar } from '@/app/_season/client';
import { getSeasonView } from '@/lib/season-data';

export default async function CrewLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ crewId: string }>;
}) {
  const { crewId } = await params;
  const view = await getSeasonView(crewId);
  if (!view) {
    return (
      <>
        {children}
        <TabBar base={`/c/${crewId}`} duelsWeek={1} mode="crew" />
      </>
    );
  }
  const weeks = view.result.weeks;
  const current = [...weeks].reverse().find((w) => w.status !== 'upcoming') ?? weeks[0]!;
  return (
    <>
      {children}
      <TabBar base={`/c/${crewId}`} duelsWeek={current.weekIndex + 1} mode="season" />
    </>
  );
}
