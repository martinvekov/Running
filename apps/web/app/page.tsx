import Link from 'next/link';

export default function Home() {
  return (
    <main className="page landing">
      <span className="label">Crew Seasons</span>
      <h1>
        Three weeks.
        <br />
        Your crew.
        <br />
        Anyone can win.
      </h1>
      <p className="note">
        Commit to your runs every Sunday. Keep your word, win your duel. Everyone is scored against
        their own baseline, so pace never counts.
      </p>
      <Link href="/demo" className="cta">
        View the demo season
      </Link>
    </main>
  );
}
