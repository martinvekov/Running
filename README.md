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

## Connecting to Supabase

The app needs two public values (see `apps/web/.env.example`), set locally in `apps/web/.env.local` and on Vercel as Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`: the project address.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project's publishable (anon) key. It is public by design; Row Level Security protects the data.

Without them the app still runs: the demo works and other pages say the app isn't connected yet. Sign-in is Google only for now (email links need a custom email sender). Configure it in Supabase under Authentication, then Sign In / Providers and URL Configuration.

## Layout

- `apps/web` — Next.js app (App Router), deployed on Vercel with root directory `apps/web`
- `packages/engine` — pure scoring engine, no I/O
- `supabase/` — config, migrations, access rules and their tests
- `docs/` — brief, scoring rules, parked ideas
