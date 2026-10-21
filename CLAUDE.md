# Crew Seasons

Free web app where friends play three-week running seasons, each scored against their own baseline. We are in an experiment: small scope, strong boundaries. The full brief is docs/brief.md.

## Commands (created in milestone 1)
- pnpm dev: run the web app
- pnpm test: run all tests
- pnpm typecheck, pnpm lint
- pnpm sim fixtures/five-runners.json: run the season simulator

## Structure
- apps/web: Next.js app (App Router)
- packages/engine: pure scoring engine, no I/O
- supabase/: migrations, Row Level Security policies, policy tests
- docs/brief.md: product brief; docs/rules.md: scoring rules in plain English

## Non-negotiable rules
1. All points come from packages/engine. Never compute or write points anywhere else.
2. The engine is pure and deterministic: no Date.now(), no randomness, no database calls. Pass time and ids in.
3. Every scoring change is a new rules version. Closed seasons keep their version.
4. Every run is a canonical activities row with a source. New sources are adapters that write that row.
5. Access is enforced by Row Level Security, not only in the UI. Every new table gets policies and policy tests.
6. Store only the fields in the brief. No location, GPS, heart rate or other health data.
7. Week boundaries use Europe/London.

## How to work
- Read docs/brief.md before starting a milestone.
- Plan before changing the schema, access rules or engine, and wait for approval.
- For engine changes, write failing tests first.
- Keep each change to one milestone step. Run typecheck and tests before finishing.
- Do not build anything outside the brief's scope. Write ideas in docs/ideas.md instead.
- Mobile-first UI. Logging a run must take under 30 seconds.
