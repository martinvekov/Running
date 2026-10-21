import { WEEK_TIME_ZONE } from '@crew/engine';

export default function Home() {
  return (
    <main className="container">
      <h1>Crew Seasons</h1>
      <p>
        Three-week running seasons with your crew, each runner scored against their own baseline.
      </p>
      <p className="muted">Coming soon. Weeks run Monday to Sunday, {WEEK_TIME_ZONE} time.</p>
    </main>
  );
}
