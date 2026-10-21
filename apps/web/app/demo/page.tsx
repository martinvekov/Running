import type { Metadata } from 'next';
import { demoView } from '../_season/data';
import { FeedScreen } from '../_season/pages';

export const metadata: Metadata = {
  title: 'Feed · Crew Seasons',
  description: 'Five fictional runners, one three-week season, scored by the real engine.',
};

export default function DemoFeedPage() {
  return <FeedScreen view={demoView} />;
}
