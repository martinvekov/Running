import Link from 'next/link';

export default function Home() {
  return (
    <main className="page landing">
      <p className="eyebrow">Crew Seasons</p>
      <h1 className="display">
        Three weeks.
        <br />
        Your crew.
        <br />
        <em>Anyone can win.</em>
      </h1>
      <p className="muted">
        Commit to your runs every Sunday, keep your word, win your duel. Everyone is scored against
        their own baseline, so pace never matters.
      </p>
      <Link href="/demo" className="cta">
        See the demo season →
      </Link>
    </main>
  );
}
