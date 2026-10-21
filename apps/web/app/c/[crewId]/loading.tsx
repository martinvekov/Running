// Shown the instant a tab is tapped, while the next page is fetched.
export default function Loading() {
  return (
    <main className="page with-tabbar" aria-busy="true" aria-label="Loading">
      <header className="masthead">
        <span className="skeleton" style={{ width: 90, height: 12 }} />
        <span className="skeleton" style={{ width: 180, height: 34 }} />
      </header>
      <section className="section">
        <span className="skeleton" style={{ width: '100%', height: 120 }} />
      </section>
      <section className="section">
        <span className="skeleton" style={{ width: '100%', height: 200 }} />
      </section>
    </main>
  );
}
