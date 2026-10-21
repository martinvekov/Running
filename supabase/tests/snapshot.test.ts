import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, canConnect, createTestDb, type TestDb } from './helpers';

// season_snapshot() hands the app everything the scoring engine needs for one season, in one
// call. It runs with the caller's rights, so Row Level Security decides what comes back.

const id = (n: string) => `00000000-0000-0000-0000-${n.padStart(12, '0')}`;
const alex = id('a1');
const priya = id('a2');
const sam = id('b1');
const crewA = id('1001');
const crewB = id('1002');
const seasonA = id('2001');
const seasonB = id('2002');

const available = await canConnect();
if (!available && process.env.CI) {
  throw new Error('CI must provide a Postgres server at DATABASE_URL for the policy tests');
}

interface Snapshot {
  season: { id: string; start_date: string; status: string; rules_version: string } | null;
  runners: { id: string; name: string; baselineKm: number; baselineRuns: number }[];
  commitments: { runnerId: string; weekIndex: number; km: number; runs: number; committedAt: string }[];
  activities: {
    id: string;
    runnerId: string;
    source: string;
    runDate: string;
    durationS: number;
    distanceM: number;
    loggedAt: string;
    linkUrl: string | null;
    bountyClaimed: boolean;
  }[];
  bounties: { weekIndex: number; title: string }[];
}

describe.skipIf(!available)('season_snapshot', () => {
  let t: TestDb;
  let db: TestDb['db'];

  beforeAll(async () => {
    t = await createTestDb();
    db = t.db;
    const rows = [alex, priya, sam, crewA, crewB, seasonA, seasonB];
    const sql = `
      insert into auth.users (id, email) values ($1, 'alex@example.com'), ($2, 'priya@example.com'), ($3, 'sam@example.com');
      insert into public.crews (id, name, organiser_id) values ($4, 'Crew A', $1), ($5, 'Crew B', $3);
      insert into public.crew_members (crew_id, user_id, role) values
        ($4, $1, 'organiser'), ($4, $2, 'member'), ($5, $3, 'organiser');
      insert into public.seasons (id, crew_id, number, start_date, status) values
        ($6, $4, 1, '2026-11-02', 'active'), ($7, $5, 1, '2026-11-02', 'active');
      insert into public.season_members (season_id, user_id, baseline_km, baseline_runs) values
        ($6, $1, 32.5, 4), ($6, $2, 15, 3), ($7, $3, 20, 3);
      insert into public.weekly_plans (season_id, user_id, week_index, planned_km, planned_runs)
        values ($6, $2, 0, 19.5, 4);
      insert into public.bounties (season_id, week_index, title) values ($6, 0, 'A run before 7am');
      insert into public.activities (id, user_id, source, run_date, duration_s, distance_m, link_url, bounty_claimed_week) values
        ('${id('3001')}', $1, 'manual', '2026-11-03', 2520, 8000, 'https://strava.com/activities/1', 0),
        ('${id('3002')}', $2, 'manual', '2026-11-04', 1500, 4200, null, null),
        ('${id('3003')}', $2, 'manual', '2026-10-20', 1500, 4200, null, null),
        ('${id('3004')}', $2, 'manual', '2026-12-10', 1500, 4200, null, null),
        ('${id('3005')}', $3, 'manual', '2026-11-03', 1800, 5000, null, null);
    `;
    await db.query(sql.replace(/\$(\d+)/g, (_, n: string) => `'${rows[Number(n) - 1]}'`));
  });

  afterAll(async () => {
    await t?.drop();
  });

  const snapshot = async (user: string, season: string) => {
    const r = await as(db, user, 'select public.season_snapshot($1) as s', [season]);
    expect(r.ok, r.message).toBe(true);
    return r.rows[0]!.s as Snapshot;
  };

  it('returns the season, runners, commitments, runs and bounties to a member', async () => {
    const s = await snapshot(priya, seasonA);
    expect(s.season?.id).toBe(seasonA);
    expect(s.season?.start_date).toBe('2026-11-02');
    expect(s.runners.map((r) => r.name)).toEqual(['alex', 'priya']);
    expect(s.runners[0]).toMatchObject({ id: alex, baselineKm: 32.5, baselineRuns: 4 });
    expect(s.commitments).toHaveLength(1);
    expect(s.commitments[0]).toMatchObject({ runnerId: priya, weekIndex: 0, km: 19.5, runs: 4 });
    expect(s.bounties).toEqual([{ weekIndex: 0, title: 'A run before 7am' }]);
  });

  it('gives each run in the shape the engine expects, with the logging time', async () => {
    const s = await snapshot(priya, seasonA);
    const run = s.activities.find((a) => a.id === id('3001'))!;
    expect(run).toMatchObject({
      runnerId: alex,
      source: 'manual',
      runDate: '2026-11-03',
      durationS: 2520,
      distanceM: 8000,
      linkUrl: 'https://strava.com/activities/1',
      bountyClaimed: true,
    });
    expect(Math.abs(Date.parse(run.loggedAt) - Date.now())).toBeLessThan(5 * 60_000);
    const plain = s.activities.find((a) => a.id === id('3002'))!;
    expect(plain.bountyClaimed).toBe(false);
    expect(plain.linkUrl).toBeNull();
  });

  it('only includes runs by season members inside the three season weeks', async () => {
    const s = await snapshot(alex, seasonA);
    expect(s.activities.map((a) => a.id).sort()).toEqual([id('3001'), id('3002')]);
  });

  it('returns nothing to someone outside the crew', async () => {
    const s = await snapshot(sam, seasonA);
    expect(s.season).toBeNull();
    expect(s.runners).toEqual([]);
    expect(s.activities).toEqual([]);
    expect(s.commitments).toEqual([]);
    expect(s.bounties).toEqual([]);
  });

  it('refuses a signed-out caller', async () => {
    const r = await as(db, null, 'select public.season_snapshot($1)', [seasonA]);
    expect(r.ok).toBe(false);
  });
});
