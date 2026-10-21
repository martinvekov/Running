# Database and access rules

- `migrations/`: the schema, helper functions and Row Level Security policies, applied in filename order.
- `tests/`: access-rule tests (Vitest). Each request runs as a real database role with the user's id in the JWT claims, the way Supabase serves it.

## Running the tests

They need any Postgres 15+ server. Set `DATABASE_URL` to a superuser connection (default `postgres://postgres:postgres@127.0.0.1:5432/postgres`); each run creates and drops its own throwaway database.

```sh
pnpm --filter @crew/supabase test
```

If no server answers, the tests skip locally. In CI (`CI=true`) they fail instead, so the rules can never go untested.

`tests/shim.sql` stands in for the parts of Supabase the migrations rely on (the `anon`, `authenticated` and `service_role` roles, `auth.users` and `auth.uid()`). It checks our rules, not Supabase's own login plumbing.

## Rules of the house

- Every table has Row Level Security and policies, and every policy has a test (CLAUDE.md rule 5).
- Runs and commitments are stamped with the server's clock by triggers, so a client cannot pick when they were logged.
- Clients never write Strava runs or week results; those come from the server (service role).
- Only the fields in the brief are stored: no location, GPS, heart rate or other health data.
- Supabase grants new tables to `anon` and `authenticated` by default. Every new table's migration must `revoke all` from both and grant back only what its policies use, as the first migration does.
