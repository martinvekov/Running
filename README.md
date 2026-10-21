# Crew Seasons

Three-week running seasons for a crew of friends, each runner scored against their own baseline. See [docs/brief.md](docs/brief.md) for the product brief and [CLAUDE.md](CLAUDE.md) for working rules.

## Getting started

Requires Node 22 and pnpm 10 (`corepack enable`).

```sh
pnpm install
pnpm dev        # web app on http://localhost:3000
pnpm test       # all tests
pnpm typecheck
pnpm lint
pnpm sim fixtures/five-runners.json   # season simulator: markdown report
```

The same fixture is published as a demo season at `/demo` on the web app.

## Layout

- `apps/web` — Next.js app (App Router), deployed on Vercel with root directory `apps/web`
- `packages/engine` — pure scoring engine, no I/O
- `supabase/` — config, migrations and policy tests
- `docs/` — brief, scoring rules, parked ideas
