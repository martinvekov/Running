import type { Metadata } from 'next';
import { demoView } from '../../_season/data';
import { StandingsScreen } from '../../_season/pages';

export const metadata: Metadata = { title: 'Standings · Crew Seasons' };

export default function DemoStandingsPage() {
  return <StandingsScreen view={demoView} />;
}
