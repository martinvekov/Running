import Link from 'next/link';

/** Shown when the app has no database address yet, so no page crashes. */
export function NotConnected() {
  return (
    <main className="page">
      <header className="masthead">
        <h1>Not connected yet</h1>
        <p className="masthead-meta">
          This copy of the app doesn&apos;t have its database address set. The demo still works.
        </p>
      </header>
      <Link href="/demo" className="cta">
        View the demo season
      </Link>
    </main>
  );
}
