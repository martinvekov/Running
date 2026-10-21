import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asAdmin, attempt, canConnect, createTestDb, type TestDb } from './helpers';

// Strava connections hold sign-in tokens. People can see that they are connected and can
// disconnect, but the tokens themselves never leave the server.

const id = (n: string) => `00000000-0000-0000-0000-${n.padStart(12, '0')}`;
const alex = id('a1');
const priya = id('a2');

const available = await canConnect();
if (!available && process.env.CI) {
  throw new Error('CI must provide a Postgres server at DATABASE_URL for the policy tests');
}

describe.skipIf(!available)('strava_connections and imported runs', () => {
  let t: TestDb;
  let db: TestDb['db'];

  beforeAll(async () => {
    t = await createTestDb();
    db = t.db;
    await db.query(`
      insert into auth.users (id, email) values ('${alex}', 'alex@example.com'), ('${priya}', 'priya@example.com');
      insert into public.strava_connections (user_id, athlete_id, access_token, refresh_token, expires_at)
        values ('${alex}', 111, 'alex-access', 'alex-refresh', now() + interval '1 hour'),
               ('${priya}', 222, 'priya-access', 'priya-refresh', now() + interval '1 hour');
    `);
  });

  afterAll(async () => {
    await t?.drop();
  });

  it('shows you your own connection status and nobody else’s', async () => {
    const r = await as(
      db,
      alex,
      'select user_id, connected_at, last_synced_at from public.strava_connections',
    );
    expect(r.ok, r.message).toBe(true);
    expect(r.rows.map((x) => x.user_id)).toEqual([alex]);
  });

  it('never lets a signed-in user read the tokens', async () => {
    for (const sql of [
      'select access_token from public.strava_connections',
      'select refresh_token from public.strava_connections',
      'select * from public.strava_connections',
      'select expires_at from public.strava_connections',
    ]) {
      const r = await as(db, alex, sql);
      expect(r.ok, sql).toBe(false);
    }
  });

  it('does not let a signed-in user create or change a connection', async () => {
    const ins = await as(
      db,
      alex,
      `insert into public.strava_connections (user_id, athlete_id, access_token, refresh_token, expires_at)
       values ($1, 1, 'x', 'y', now())`,
      [id('a3')],
    );
    expect(ins.ok).toBe(false);
    const upd = await as(db, alex, `update public.strava_connections set athlete_id = 9`);
    expect(upd.ok).toBe(false);
  });

  it('lets you disconnect yourself and nobody else', async () => {
    const own = await as(db, alex, 'delete from public.strava_connections where user_id = $1', [
      alex,
    ]);
    expect(own.ok, own.message).toBe(true);
    expect(own.count).toBe(1);
    const other = await as(db, alex, 'delete from public.strava_connections where user_id = $1', [
      priya,
    ]);
    expect(other.count).toBe(0);
  });

  it('gives the signed-out role nothing', async () => {
    const r = await as(db, null, 'select user_id from public.strava_connections');
    expect(r.ok).toBe(false);
  });

  it('keeps the recording time of an imported run, but never lets a manual run choose its own', async () => {
    await asAdmin(db, async () => {
      await db.query('set local role service_role');
      const imported = await attempt(
        db,
        `insert into public.activities (user_id, source, source_ref, run_date, duration_s, distance_m, created_at)
         values ($1, 'strava', '555', '2026-10-13', 1800, 5000, '2026-10-13T08:00:00Z') returning created_at`,
        [alex],
      );
      expect(imported.ok, imported.message).toBe(true);
      expect(new Date(imported.rows[0]!.created_at as string).toISOString()).toBe(
        '2026-10-13T08:00:00.000Z',
      );
      const manual = await attempt(
        db,
        `insert into public.activities (user_id, source, run_date, duration_s, distance_m, created_at)
         values ($1, 'manual', '2026-10-13', 1800, 5000, '2020-01-01T00:00:00Z') returning created_at`,
        [alex],
      );
      expect(Date.now() - new Date(manual.rows[0]!.created_at as string).getTime()).toBeLessThan(
        60_000,
      );
    });
  });

  it('never stamps an imported run in the future', async () => {
    await asAdmin(db, async () => {
      await db.query('set local role service_role');
      const r = await attempt(
        db,
        `insert into public.activities (user_id, source, source_ref, run_date, duration_s, distance_m, created_at)
         values ($1, 'strava', '556', '2026-10-13', 1800, 5000, now() + interval '5 days') returning created_at`,
        [alex],
      );
      expect(new Date(r.rows[0]!.created_at as string).getTime()).toBeLessThanOrEqual(
        Date.now() + 1000,
      );
    });
  });
});
