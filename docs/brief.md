# Crew Seasons — Build Brief for Claude Code

Oct 21, 2026 · @Martin

## What we're building

A free web app on Vercel where a crew of friends plays a three-week running season, each person scored against their own baseline so anyone can win. We run it as a four-week experiment with three crews: ours plus two we don't organise.

The experiment answers one question: **do people care who wins by week three?** Signals that count are people checking the standings, arguing about an overtake, sharing the recap, recruiting a friend, and starting season two without being asked. Logged runs alone do not count, because people would run anyway.

The build is deliberately small: one scoring system, a leaderboard with a clear points breakdown, and a weekly recap card for WhatsApp. The foundation keeps three boundaries that are cheap now and painful later: source-agnostic activities, scores derived by a pure engine, and database-enforced access rules. Everything else waits for evidence.

## Scope

**In:**

- Sign in with email magic link or Google.
- Create a crew, invite by link, join.
- Set up a three-week season with a frozen baseline per runner.
- Commit to next week's runs and km by Sunday 23:59.
- Runs import automatically from Strava; anyone without Strava (or beyond Strava's athlete limit) logs runs manually.
- Scoring v1 (below), a leaderboard, and a per-runner points breakdown.
- Weekly head-to-head duels and one weekly wildcard bounty.
- Weekly close: a recap card image plus text, ready to share to WhatsApp.
- Reactions on runs and overtakes.
- One-tap "start season two" for the organiser.
- An end-of-season survey and product analytics.
- Account deletion.

**Out, until the experiment says otherwise:**

- Apple Health, Health Connect or Garmin sync. These are the planned long-term source of runs (see Open decisions) but need a native app or a partner agreement, so they wait for evidence.
- Native apps and push notifications.
- Tag, territory, shared journey, clubs and leagues.
- A generic framework for future game modes.
- Payments, chat, maps, routes, GPS, heart rate.

The data is limited to date, duration, distance and an optional link, even for runs imported from Strava. No location or health data means far lighter privacy obligations for the experiment.

## Scoring v1

The scoring is the product, so it is specified exactly and simulated before any screen is built. Points come mostly from moments (duels, bounties) on top of a fairness floor (keeping your own plan). Running harder or further than planned earns nothing.

**Definitions**

- **Week:** Monday 00:00 to Sunday 23:59, Europe/London. Weekly scores close Monday 12:00, so Sunday runs can still be logged.
- **Season:** three consecutive weeks starting on a Monday.
- **Baseline:** each runner's typical weekly km and runs per week, entered at season start and frozen for the season. From season two, it defaults to their average from the previous season.
- **Commitment (the plan):** each runner commits to next week's runs and km by Sunday 23:59, Europe/London. No training plan is needed: just two numbers. Committed km must sit between 80% and 130% of baseline km; committed runs between one fewer and two more than baseline runs (minimum 1). A commitment made after the deadline does not count. If no commitment is made, the previous week's carries over; in week one, the baseline is the commitment.
- **Qualifying run:** at least 15 minutes or 2 km, logged by 23:59 two days after the run date and before the week closes. Every qualifying run counts towards km; at most one per calendar day counts as a run (for show-up points and committed runs).

**Weekly points**

| Rule | Points | Why |
| --- | --- | --- |
| Show up | 5 per qualifying run, up to 4 runs (max 20) | Rewards consistency, not distance or pace |
| Keep your word | 15 for every committed run and 95% or more of committed km; 8 for at most one run short and 75% or more of committed km | The fairness floor |
| Ambition | +1 for each full 10% the committed km sits above baseline km (max +3), only in a week that earns keep-your-word points | Small enough that sandbagging costs little and overreaching gains little |
| Duel | Win 10, draw 5, lose 0 | The weekly moment; neutral to ability |
| Bounty | 5, once a week | Cheap, social fun |
| Beyond plan | 0 | No incentive to run harder or further |

The weekly maximum is 53. Season standings are the sum of three weeks.

**Duels:** each Monday the engine pairs runners round-robin, so everyone meets different crew mates. The first to reach 100% of their own planned km, by run date, wins; the same date is a draw. If neither reaches 100%, the higher percentage wins, and a gap under 5 percentage points is a draw. In an odd-sized crew, one trio duels: each trio member duels the other two and scores the average, rounded up, so outright first gets 10, second 5 and third 0.

**Bounty:** the organiser picks one per week from a default list (a run before 7am, a run with a crew mate, a new route) or writes their own. Runners claim it on a run, and crew mates can react.

**Tie-breaks:** duel wins, then weeks with the plan kept, then the earlier final qualifying run.

**How v1 answers the hard questions**

| Question | Answer under v1 |
| --- | --- |
| Does an easy plan completed beat an ambitious one narrowly missed? | Yes, narrowly. An 80% plan completed scores 15; a 130% plan at 90% scores 8 + 3 = 11. Keeping your word wins, and the plan band caps the gap |
| Can a consistent runner compete with a fast-improving beginner? | Yes. Both are scored against their own frozen baseline, and improvement itself earns nothing |
| Can you win with sensible easy running? | Yes. No points depend on pace, and four easy runs with the plan kept score 35 of 53 |
| Does improving mid-season make winning harder? | No. Baselines are frozen during a season and only update between seasons |

**Simulator first**

Before any UI, build the engine and a command-line simulator. It takes a JSON file of five fictional runners over three weeks: a steady veteran, an ambitious improver, a sandbagger, a busy parent who misses week two, and a beginner. It outputs weekly standings and each runner's points breakdown as markdown.

Rules live in versioned config files, so variants can be simulated side by side. The same output is published as a read-only demo season page on the web app, with standings, breakdowns and each runner's runs. Martin shows the output to the first users and asks who won, why, and whether that feels fair. Rules change before code does.

## Stack and boundaries

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router) with TypeScript, deployed on Vercel |
| Database and auth | Supabase: Postgres, Auth (magic link, Google), Row Level Security |
| Engine | A pure TypeScript package with no I/O, shared by the app, the simulator and tests |
| Tests | Vitest for the engine and database policies |
| Weekly close | A scheduled job every Monday at 12:00 Europe/London |
| Recap image | Generated server-side as a PNG, plus copy-paste text |
| Analytics | PostHog |
| Repo | pnpm workspace: `apps/web`, `packages/engine`, `supabase/` |

Three boundaries to keep, and nothing more:

1. **Source-agnostic activities.** Every run is stored as one canonical record with a `source` field (`manual` for now). Adding Strava or a health store later means writing one adapter, not touching scoring.
2. **Scores are derived.** The engine is a deterministic function: season, runners, baselines, plans, activities, duel pairings and rules version in; standings and breakdowns out. Nothing writes points by hand. Any week can be recomputed.
3. **Access in the database.** Row Level Security enforces that only crew members see a crew's data, and only the owner edits their own runs and plans. Policies have tests.

The data model is expected to change as we learn. A new table is fine; it is not a sign the architecture failed. What must hold are the three boundaries above.

## Data model

Ten tables cover the experiment. Points are never stored as source data; `week_results` is a cache the engine rewrites.

| Table | Key fields | Notes |
| --- | --- | --- |
| `profiles` | id (auth user), display\_name, created\_at | One per user |
| `crews` | id, name, organiser\_id, invite\_code, created\_at | Invite code is random and revocable |
| `crew_members` | crew\_id, user\_id, role (organiser or member), joined\_at |  |
| `seasons` | id, crew\_id, number, start\_date, rules\_version, status (setup, active, closed) | Three weeks from start\_date |
| `season_members` | season\_id, user\_id, baseline\_km, baseline\_runs | Frozen once the season is active |
| `weekly_plans` | season\_id, user\_id, week\_index, planned\_km, planned\_runs, committed\_at | The weekly commitment; checked against the bands and the Sunday 23:59 deadline |
| `activities` | id, user\_id, source, source\_ref, run\_date, duration\_s, distance\_m, link\_url, bounty\_claimed\_week, created\_at | `source` is `strava` or `manual`; canonical for all future sources. No maps, GPS or heart rate, even from Strava |
| `bounties` | season\_id, week\_index, title | One per week |
| `events` | id, crew\_id, season\_id, type, actor\_id, payload, created\_at | Append-only: run logged, plan set, overtake, reaction, recap shared, season started |
| `week_results` | season\_id, user\_id, week\_index, points\_total, breakdown (JSON), rules\_version, computed\_at | Engine output cache; safe to delete and rebuild |

Duel pairings are computed by the engine from the season id and member list, so they need no table. Reactions are stored as events.

## Screens and flows

Design mobile-first: almost everyone will open it from a WhatsApp link on their phone. Logging a run must take under 30 seconds.

| Screen | What it does |
| --- | --- |
| Sign in | Magic link or Google; display name on first visit |
| Join or create | Join through an invite link, or create a crew and get its link |
| Season setup (organiser) | Pick a start Monday and the three weekly bounties; members enter their own baseline |
| Crew home | The main screen: your plan progress, your duel (you vs a crew mate, % of plan each), this week's bounty, season standings with movement since last week, and the crew feed |
| Connect Strava | One-time connection; runs then arrive automatically |
| Log a run | Manual fallback: date, duration, distance, optional activity link, bounty claim |
| Commit | Next week's runs and km, with the allowed bands and the Sunday 23:59 deadline shown; defaults to last week's commitment |
| Points breakdown | For any runner and week: every rule line, its points, and a one-sentence reason |
| Weekly recap | Recap image and text with standings, duel results, the biggest mover and the bounty; share via the phone's share sheet or a WhatsApp link |
| Season end | Final standings, the survey, and the organiser's one-tap "start season two" |
| Settings | Leave crew, delete account |

The feed shows runs, reactions, duel results and overtakes. An overtake is emitted whenever a new run changes the order of the season standings.

## Build order

Six milestones, each ending in something checkable. Best case is about 30 hours; plan for 60, so the experiment is still worth running if the build takes twice as long.

1. **Repo and pipeline** (about 2 hours). pnpm workspace with the Next.js app and engine package, Supabase project linked, CLAUDE.md, lint, typecheck and tests in CI, Vercel preview deploys.
   - Done when: a placeholder page deploys from main and CI is green.
2. **Engine and simulator** (about 6 hours). Rules v1 as versioned config, the pure engine, and a command-line simulator that reads `fixtures/five-runners.json` and prints standings and breakdowns as markdown, plus the demo season page.
   - Tests cover every rule in the points table, plan-band validation, round-robin pairing, the odd-crew trio, tie-breaks, and determinism (the same inputs in any order give identical output).
   - Done when: Martin has shown the simulator output to the first users and folded their reactions into the rules.
3. **Schema, auth and access rules** (about 4 hours). Migrations for the ten tables, Supabase Auth, Row Level Security policies with tests.
   - Done when: tests prove a non-member cannot read a crew and a member cannot edit another member's run or plan.
4. **Core loop** (about 8 hours). Sign in, create or join a crew, season setup, commitments, Strava import with manual logging as a fallback, crew home with standings, and the points breakdown. Every activity change recomputes that season through the engine.
   - Done when: the three first users complete a dry-run week on staging without help.
5. **Social layer** (about 6 hours). Duels on the home screen, bounties, the feed with reactions and overtakes, the Monday close job, and the recap image and share flow.
   - Done when: a recap generated from simulator data looks right and shares to WhatsApp from both an iPhone and an Android phone.
6. **Measure and repeat** (about 4 hours). Analytics events, the end-of-season survey, the season-two flow, account deletion and a short privacy notice.
   - Done when: every event in the next section fires on staging.

Then launch to three crews and stop building features for the duration of the season. Fix bugs only.

## Instrumentation and success signals

We measure playing, not running. Every event carries user, crew, season and week.

| Event | Fired when | What it tells us |
| --- | --- | --- |
| `standings_viewed` | Crew home or standings opened | Do people check who is winning? |
| `breakdown_opened` | A points breakdown is opened | Do people care why someone is winning? |
| `run_logged` | A run is saved (with source, link present, bounty claimed) | Baseline activity and logging friction |
| `plan_set` | A weekly plan is saved (with plan-to-baseline ratio) | Are people sandbagging or stretching? |
| `reaction_added` | Someone reacts to a run, duel or overtake | In-app banter |
| `recap_shared` | The recap is shared or its text copied | Does the game leave the app? |
| `member_joined` | Someone joins through an invite (with inviter) | Do players recruit? |
| `season_two_started` | A crew starts its next season (with days since end) | The decisive signal |
| `survey_answered` | The end-of-season survey is submitted | Stated demand |

The survey's key question: "How would you feel if you could no longer use this?" (very disappointed, somewhat disappointed, not disappointed), plus one free-text question about what to change.

**What would make us keep going** (our own thresholds, set before launch so we can't move them):

- At least two of the three crews start season two within seven days, with nobody chasing them. The app prompts once; Martin does not.
- Runners open the standings at least three times a week by week three, on median.
- Each organiser shares the recap every week.
- At least one new member joins through an invite.
- At least 40% answer "very disappointed" in the survey.

If by week three people log runs but rarely open the standings, the scoring is not working. We change the rules before building anything else.

## Taking this to Claude Code

Export this brief as Markdown and save it in the repo as `docs/brief.md`. Save the block below as `CLAUDE.md` at the repo root. Then start with this prompt:

> Read CLAUDE.md and docs/brief.md. Plan milestone 1 (repo and pipeline) and show me the plan before writing code. After that, stop and wait for review.

Work one milestone at a time, and review the plan before every milestone that touches the schema, access rules or the engine.

```markdown
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
```

## Open decisions

- [ ] **Strava (decided for the experiment, with a known risk).** Runs import from Strava and show in the crew feed, with manual logging as a fallback. This is for a small private crew only. Strava's API terms (since Nov 2024) say an app may show a user's Strava data only to that user, so showing it to crew mates may breach them, and Strava could revoke the app. Mitigations: Strava stays one adapter behind the `source` field and can be switched off without touching scoring; stay within 10 athletes; ask developers@strava.com in writing. If Strava objects, fall back to manual logging.
- [ ] **Direct-from-device sources.** The long-term plan is to take runs straight from the watch or phone (Apple Health via a native iOS app, Garmin via its developer programme, Health Connect on Android) instead of through Strava. Each is one more adapter writing the same `activities` row.
- [ ] **Baselines.** Self-reported for season one. After the simulator review, decide whether the plan band alone is enough to stop sandbagging.
- [ ] **Injury and holiday freeze.** Left out of v1. Revisit if anyone drops out mid-season.
- [ ] **The two other crews.** Recruit both organisers before milestone 5, so the season can start as soon as the build is ready.
- [ ] **Name and domain.** "Crew Seasons" is a working title.
