import Link from 'next/link';
import { WEEK_TIME_ZONE } from '@crew/engine';

export default function Home() {
  return (
    <main className="page landing">
      <p className="eyebrow">Crew Seasons</p>
      <h1>Three weeks. Your crew. Anyone can win.</h1>
      <p className="muted">
        Commit to your runs each Sunday, keep your word, win your duel. Everyone is scored against
        their own baseline, so pace never matters.
      </p>
      <Link href="/demo" className="cta">
        See the demo season →
      </Link>
      <p className="muted small">Weeks run Monday to Sunday, {WEEK_TIME_ZONE} time.</p>
    </main>
  );
}
