import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, asAdmin, asUser, attempt, canConnect, createTestDb, type TestDb } from './helpers';

// Access-rule tests (CLAUDE.md rule 5). Each request runs as a real database role with the
// user's id in the JWT claims, exactly as Supabase serves it, so these exercise the Row Level
// Security policies rather than application code.

const RLS_VIOLATION = '42501';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';

const id = (n: string) => `00000000-0000-0000-0000-${n.padStart(12, '0')}`;
const alex = id('a1'); // organiser of crew A
const priya = id('a2'); // member of crew A
const jo = id('a3'); // member of crew A
const sam = id('b1'); // organiser of crew B
const eve = id('c1'); // belongs to no crew

const crewA = id('1001');
const crewB = id('1002');
const seasonA = id('2001'); // crew A, active
const seasonA2 = id('2002'); // crew A, still in setup
const seasonB = id('2003'); // crew B, active
const alexRun = id('3001');
const priyaRun = id('3002');
const samRun = id('3003');

const available = await canConnect();
if (!available && process.env.CI) {
  throw new Error('CI must provide a Postgres server at DATABASE_URL for the policy tests');
}

describe.skipIf(!available)('access rules', () => {
  let t: TestDb;
  let db: TestDb['db'];

  beforeAll(async () => {
    t = await createTestDb();
    db = t.db;
    const seedParams = [
      alex,
      priya,
      jo,
      sam,
      eve,
      crewA,
      crewB,
      seasonA,
      seasonA2,
      seasonB,
      alexRun,
      priyaRun,
      samRun,
    ];
    const seedSql = `
      insert into auth.users (id, email) values
        ($1, 'alex@example.com'), ($2, 'priya@example.com'), ($3, 'jo@example.com'),
        ($4, 'sam@example.com'), ($5, 'eve@example.com');

      insert into public.crews (id, name, organiser_id, invite_code) values
        ($6, 'Crew A', $1, 'invite-a'), ($7, 'Crew B', $4, 'invite-b');
      insert into public.crew_members (crew_id, user_id, role) values
        ($6, $1, 'organiser'), ($6, $2, 'member'), ($6, $3, 'member'), ($7, $4, 'organiser');

      insert into public.seasons (id, crew_id, number, start_date, status) values
        ($8, $6, 1, '2026-11-02', 'active'),
        ($9, $6, 2, '2026-12-07', 'setup'),
        ($10, $7, 1, '2026-11-02', 'active');
      insert into public.season_members (season_id, user_id, baseline_km, baseline_runs) values
        ($8, $1, 32, 4), ($8, $2, 15, 3), ($9, $2, 15, 3), ($10, $4, 20, 3);

      insert into public.weekly_plans (season_id, user_id, week_index, planned_km, planned_runs) values
        ($8, $2, 0, 19.5, 4), ($10, $4, 0, 20, 3);
      insert into public.activities (id, user_id, source, run_date, duration_s, distance_m) values
        ($11, $1, 'manual', '2026-11-03', 2520, 8000),
        ($12, $2, 'manual', '2026-11-03', 1500, 4200),
        ($13, $4, 'manual', '2026-11-03', 1800, 5000);
      insert into public.bounties (season_id, week_index, title) values
        ($8, 0, 'A run before 7am'), ($10, 0, 'Crew B bounty');
      insert into public.events (crew_id, season_id, type, actor_id) values
        ($6, $8, 'run_logged', $1), ($7, $10, 'run_logged', $4);
      insert into public.week_results (season_id, user_id, week_index, points_total, breakdown, rules_version) values
        ($8, $1, 0, 48, '{}', 'v1'), ($10, $4, 0, 30, '{}', 'v1');
    `;
    // Several statements cannot share query parameters, so the constant ids are inlined.
    await db.query(seedSql.replace(/\$(\d+)/g, (_, n: string) => `'${seedParams[Number(n) - 1]}'`));
  });

  afterAll(async () => {
    await t?.drop();
  });

  const TABLES = [
    'crews',
    'crew_members',
    'seasons',
    'season_members',
    'weekly_plans',
    'activities',
    'bounties',
    'events',
    'week_results',
  ];

  describe('a non-member cannot read a crew', () => {
    it('sees nothing in any crew table when they belong to no crew', async () => {
      for (const table of TABLES) {
        const r = await as(db, eve, `select * from public.${table}`);
        expect(r.ok, table).toBe(true);
        expect(r.count, table).toBe(0);
      }
    });

    it("cannot see another crew's rows, only their own", async () => {
      const crews = await as(db, sam, 'select id from public.crews');
      expect(crews.rows.map((r) => r.id)).toEqual([crewB]);
      for (const table of ['seasons', 'activities', 'events', 'bounties', 'week_results']) {
        const all = await as(db, sam, `select * from public.${table}`);
        expect(all.count, table).toBe(1);
      }
      const plans = await as(db, sam, 'select * from public.weekly_plans');
      expect(plans.rows.every((r) => r.season_id === seasonB)).toBe(true);
    });

    it('cannot read a crew directly by id or invite code', async () => {
      expect((await as(db, eve, 'select * from public.crews where id = $1', [crewA])).count).toBe(
        0,
      );
      expect(
        (await as(db, eve, `select * from public.crews where invite_code = 'invite-a'`)).count,
      ).toBe(0);
    });

    it('is refused entirely when signed out', async () => {
      for (const table of TABLES) {
        const r = await as(db, null, `select * from public.${table}`);
        expect(r.ok ? r.count : 0, table).toBe(0);
      }
    });
  });

  describe('members can read their crew', () => {
    it('sees the crew, its members, seasons, plans, runs, bounties, events and results', async () => {
      expect((await as(db, priya, 'select * from public.crews')).count).toBe(1);
      expect((await as(db, priya, 'select * from public.crew_members')).count).toBe(3);
      expect((await as(db, priya, 'select * from public.seasons')).count).toBe(2);
      expect((await as(db, priya, 'select * from public.season_members')).count).toBe(3);
      expect((await as(db, priya, 'select * from public.weekly_plans')).count).toBe(1);
      expect((await as(db, priya, 'select * from public.activities')).count).toBe(2);
      expect((await as(db, priya, 'select * from public.bounties')).count).toBe(1);
      expect((await as(db, priya, 'select * from public.events')).count).toBe(1);
      expect((await as(db, priya, 'select * from public.week_results')).count).toBe(1);
    });

    it("can read a crew mate's runs but not an outsider's", async () => {
      const mine = await as(db, priya, 'select id from public.activities where user_id = $1', [
        alex,
      ]);
      expect(mine.count).toBe(1);
      const theirs = await as(db, priya, 'select id from public.activities where user_id = $1', [
        sam,
      ]);
      expect(theirs.count).toBe(0);
    });
  });

  describe('runs', () => {
    const insertRun = `insert into public.activities (user_id, source, run_date, duration_s, distance_m)
                       values ($1, $2, '2026-11-05', 1800, 5000) returning *`;

    it('lets a member log their own manual run', async () => {
      const r = await as(db, priya, insertRun, [priya, 'manual']);
      expect(r.ok).toBe(true);
      expect(r.count).toBe(1);
    });

    it('stamps the logging time on the server, ignoring a forged one', async () => {
      const r = await as(
        db,
        priya,
        `insert into public.activities (user_id, source, run_date, duration_s, distance_m, created_at)
         values ($1, 'manual', '2026-11-05', 1800, 5000, '2020-01-01') returning created_at`,
        [priya],
      );
      expect(r.ok).toBe(true);
      const loggedAt = new Date(r.rows[0]!.created_at as string).getTime();
      expect(Math.abs(Date.now() - loggedAt)).toBeLessThan(60_000);
    });

    it('cannot log a run as someone else', async () => {
      const r = await as(db, priya, insertRun, [alex, 'manual']);
      expect(r.ok).toBe(false);
      expect(r.code).toBe(RLS_VIOLATION);
    });

    it('cannot create a Strava-sourced run from the client', async () => {
      const r = await as(db, priya, insertRun, [priya, 'strava']);
      expect(r.ok).toBe(false);
      expect(r.code).toBe(RLS_VIOLATION);
    });

    it("cannot edit or delete another member's run", async () => {
      const upd = await as(db, priya, 'update public.activities set distance_m = 1 where id = $1', [
        alexRun,
      ]);
      expect(upd.count).toBe(0);
      const del = await as(db, priya, 'delete from public.activities where id = $1', [alexRun]);
      expect(del.count).toBe(0);
    });

    it('cannot edit their own run after the fact, but can delete it to log it again', async () => {
      const upd = await as(
        db,
        priya,
        'update public.activities set distance_m = 9999 where id = $1',
        [priyaRun],
      );
      expect(upd.count).toBe(0);
      const del = await as(db, priya, 'delete from public.activities where id = $1', [priyaRun]);
      expect(del.count).toBe(1);
    });

    it('rejects impossible values and unsafe links', async () => {
      const negative = await as(
        db,
        priya,
        `insert into public.activities (user_id, source, run_date, duration_s, distance_m)
         values ($1, 'manual', '2026-11-05', 1800, -5)`,
        [priya],
      );
      expect(negative.code).toBe(CHECK_VIOLATION);
      const link = await as(
        db,
        priya,
        `insert into public.activities (user_id, source, run_date, duration_s, distance_m, link_url)
         values ($1, 'manual', '2026-11-05', 1800, 5000, 'javascript:alert(1)')`,
        [priya],
      );
      expect(link.code).toBe(CHECK_VIOLATION);
    });
  });

  describe('commitments (weekly plans)', () => {
    const insertPlan = `insert into public.weekly_plans (season_id, user_id, week_index, planned_km, planned_runs)
                        values ($1, $2, 1, 20, 4) returning *`;

    it('lets a season member commit for themselves', async () => {
      const r = await as(db, priya, insertPlan, [seasonA, priya]);
      expect(r.ok).toBe(true);
    });

    it('stamps the commitment time on the server, ignoring a forged one', async () => {
      const r = await as(
        db,
        priya,
        `insert into public.weekly_plans (season_id, user_id, week_index, planned_km, planned_runs, committed_at)
         values ($1, $2, 1, 20, 4, '2020-01-01') returning committed_at`,
        [seasonA, priya],
      );
      const at = new Date(r.rows[0]!.committed_at as string).getTime();
      expect(Math.abs(Date.now() - at)).toBeLessThan(60_000);
    });

    it("cannot commit on someone else's behalf", async () => {
      const r = await as(db, priya, insertPlan, [seasonA, alex]);
      expect(r.code).toBe(RLS_VIOLATION);
    });

    it('cannot commit in a season they are not part of', async () => {
      expect((await as(db, jo, insertPlan, [seasonA, jo])).code).toBe(RLS_VIOLATION);
      expect((await as(db, sam, insertPlan, [seasonA, sam])).code).toBe(RLS_VIOLATION);
    });

    it('cannot rewrite or remove a commitment once made', async () => {
      const upd = await as(
        db,
        priya,
        'update public.weekly_plans set planned_km = 1 where user_id = $1',
        [priya],
      );
      expect(upd.count).toBe(0);
      const del = await as(db, priya, 'delete from public.weekly_plans where user_id = $1', [
        priya,
      ]);
      expect(del.count).toBe(0);
    });

    it("cannot change another member's commitment", async () => {
      const upd = await as(
        db,
        alex,
        'update public.weekly_plans set planned_km = 1 where user_id = $1',
        [priya],
      );
      expect(upd.count).toBe(0);
    });
  });

  describe('season setup', () => {
    it('lets the organiser create a season starting on a Monday', async () => {
      const r = await as(
        db,
        alex,
        `insert into public.seasons (crew_id, number, start_date) values ($1, 3, '2027-01-04') returning *`,
        [crewA],
      );
      expect(r.ok).toBe(true);
    });

    it('rejects a season that does not start on a Monday', async () => {
      const r = await as(
        db,
        alex,
        `insert into public.seasons (crew_id, number, start_date) values ($1, 3, '2027-01-05')`,
        [crewA],
      );
      expect(r.code).toBe(CHECK_VIOLATION);
    });

    it('does not let a member or another crew organiser create a season', async () => {
      const sql = `insert into public.seasons (crew_id, number, start_date) values ($1, 3, '2027-01-04')`;
      expect((await as(db, priya, sql, [crewA])).code).toBe(RLS_VIOLATION);
      expect((await as(db, sam, sql, [crewA])).code).toBe(RLS_VIOLATION);
    });

    it('lets only the organiser set bounties', async () => {
      const sql = `insert into public.bounties (season_id, week_index, title) values ($1, 1, 'A new route')`;
      expect((await as(db, alex, sql, [seasonA])).ok).toBe(true);
      expect((await as(db, priya, sql, [seasonA])).code).toBe(RLS_VIOLATION);
      expect((await as(db, sam, sql, [seasonA])).code).toBe(RLS_VIOLATION);
    });

    it('lets members join and edit their baseline only while the season is in setup', async () => {
      const join = `insert into public.season_members (season_id, user_id, baseline_km, baseline_runs)
                    values ($1, $2, 10, 2)`;
      expect((await as(db, jo, join, [seasonA2, jo])).ok).toBe(true);
      expect((await as(db, jo, join, [seasonA, jo])).code).toBe(RLS_VIOLATION);

      const edit =
        'update public.season_members set baseline_km = 18 where season_id = $1 and user_id = $2';
      expect((await as(db, priya, edit, [seasonA2, priya])).count).toBe(1);
      expect((await as(db, priya, edit, [seasonA, priya])).count).toBe(0);
    });

    it("cannot join as someone else or edit someone else's baseline", async () => {
      const join = `insert into public.season_members (season_id, user_id, baseline_km, baseline_runs)
                    values ($1, $2, 10, 2)`;
      expect((await as(db, jo, join, [seasonA2, priya])).code).toBe(RLS_VIOLATION);
      const edit =
        'update public.season_members set baseline_km = 1 where season_id = $1 and user_id = $2';
      expect((await as(db, jo, edit, [seasonA2, priya])).count).toBe(0);
    });

    it('freezes the start date and rules once a season is active', async () => {
      const r = await as(
        db,
        alex,
        `update public.seasons set start_date = '2026-11-09' where id = $1`,
        [seasonA],
      );
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/frozen/i);
      const rules = await as(
        db,
        alex,
        `update public.seasons set rules_version = 'v2' where id = $1`,
        [seasonA],
      );
      expect(rules.ok).toBe(false);
    });

    it('only moves a season forward: setup, active, closed', async () => {
      const back = await as(db, alex, `update public.seasons set status = 'setup' where id = $1`, [
        seasonA,
      ]);
      expect(back.ok).toBe(false);
      const start = await as(
        db,
        alex,
        `update public.seasons set status = 'active' where id = $1`,
        [seasonA2],
      );
      expect(start.ok).toBe(true);
    });
  });

  describe('crews and invites', () => {
    it('lets any signed-in user create a crew and become its organiser', async () => {
      await asUser(db, eve, async () => {
        const made = await attempt(db, `select * from public.create_crew('Eve crew')`);
        expect(made.ok).toBe(true);
        const crew = await attempt(db, 'select * from public.crews');
        expect(crew.count).toBe(1);
        expect(crew.rows[0]!.organiser_id).toBe(eve);
        expect(String(crew.rows[0]!.invite_code).length).toBeGreaterThanOrEqual(20);
        const members = await attempt(db, 'select role from public.crew_members');
        expect(members.rows).toEqual([{ role: 'organiser' }]);
      });
    });

    it('does not let anyone create crews or memberships directly', async () => {
      const crew = await as(
        db,
        eve,
        `insert into public.crews (name, organiser_id) values ('x', $1)`,
        [eve],
      );
      expect(crew.code).toBe(RLS_VIOLATION);
      const join = await as(
        db,
        eve,
        `insert into public.crew_members (crew_id, user_id, role) values ($1, $2, 'member')`,
        [crewA, eve],
      );
      expect(join.code).toBe(RLS_VIOLATION);
    });

    it('lets a user join with a valid invite code, once', async () => {
      await asUser(db, eve, async () => {
        const joined = await attempt(db, `select public.join_crew('invite-a') as crew`);
        expect(joined.ok).toBe(true);
        expect(joined.rows[0]!.crew).toBe(crewA);
        expect((await attempt(db, 'select * from public.crews')).count).toBe(1);
        expect((await attempt(db, 'select * from public.activities')).count).toBe(2);
        const again = await attempt(db, `select public.join_crew('invite-a')`);
        expect(again.ok).toBe(true);
        expect(
          (await attempt(db, 'select * from public.crew_members where user_id = $1', [eve])).count,
        ).toBe(1);
      });
    });

    it('rejects a wrong invite code and a signed-out join', async () => {
      expect((await as(db, eve, `select public.join_crew('nope')`)).ok).toBe(false);
      expect((await as(db, null, `select public.join_crew('invite-a')`)).ok).toBe(false);
    });

    it('lets only the organiser revoke an invite, which kills the old code', async () => {
      expect((await as(db, priya, 'select public.rotate_invite_code($1)', [crewA])).ok).toBe(false);
      await asUser(db, alex, async () => {
        const rotated = await attempt(db, 'select public.rotate_invite_code($1) as code', [crewA]);
        expect(rotated.ok).toBe(true);
        expect(rotated.rows[0]!.code).not.toBe('invite-a');
      });
    });

    it('stops working with the old code after it is revoked', async () => {
      await db.query('begin');
      try {
        await db.query(`update public.crews set invite_code = 'rotated' where id = $1`, [crewA]);
        await db.query('set local role authenticated');
        await db.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: eve }),
        ]);
        expect((await attempt(db, `select public.join_crew('invite-a')`)).ok).toBe(false);
        expect((await attempt(db, `select public.join_crew('rotated')`)).ok).toBe(true);
      } finally {
        await db.query('rollback');
      }
    });

    it('lets a member leave, after which they can no longer read the crew', async () => {
      await asUser(db, priya, async () => {
        const left = await attempt(db, 'delete from public.crew_members where user_id = $1', [
          priya,
        ]);
        expect(left.count).toBe(1);
        expect((await attempt(db, 'select * from public.crews')).count).toBe(0);
        expect(
          (await attempt(db, 'select * from public.activities where user_id = $1', [alex])).count,
        ).toBe(0);
      });
    });

    it('does not let the organiser abandon the crew, but lets them remove members', async () => {
      const leave = await as(db, alex, 'delete from public.crew_members where user_id = $1', [
        alex,
      ]);
      expect(leave.count).toBe(0);
      const remove = await as(db, alex, 'delete from public.crew_members where user_id = $1', [jo]);
      expect(remove.count).toBe(1);
    });

    it('does not let a member or an outsider remove someone else', async () => {
      expect(
        (await as(db, priya, 'delete from public.crew_members where user_id = $1', [jo])).count,
      ).toBe(0);
      expect(
        (await as(db, sam, 'delete from public.crew_members where user_id = $1', [priya])).count,
      ).toBe(0);
    });

    it('lets only the organiser rename or delete the crew', async () => {
      expect(
        (await as(db, priya, `update public.crews set name = 'x' where id = $1`, [crewA])).count,
      ).toBe(0);
      expect(
        (await as(db, alex, `update public.crews set name = 'Renamed' where id = $1`, [crewA]))
          .count,
      ).toBe(1);
      expect((await as(db, priya, 'delete from public.crews where id = $1', [crewA])).count).toBe(
        0,
      );
      const handover = await as(
        db,
        alex,
        `update public.crews set organiser_id = $2 where id = $1`,
        [crewA, priya],
      );
      expect(handover.count).toBe(0);
    });
  });

  describe('append-only and engine-written tables', () => {
    const insertEvent = `insert into public.events (crew_id, season_id, type, actor_id) values ($1, $2, 'reaction', $3)`;

    it('lets a member add events as themselves, in their own crew only', async () => {
      expect((await as(db, priya, insertEvent, [crewA, seasonA, priya])).ok).toBe(true);
      expect((await as(db, priya, insertEvent, [crewA, seasonA, alex])).code).toBe(RLS_VIOLATION);
      expect((await as(db, priya, insertEvent, [crewB, seasonB, priya])).code).toBe(RLS_VIOLATION);
      expect((await as(db, priya, insertEvent, [crewA, seasonB, priya])).code).toBe(RLS_VIOLATION);
    });

    it('never lets anyone edit or delete an event', async () => {
      expect((await as(db, alex, `update public.events set type = 'plan_set'`)).count).toBe(0);
      expect((await as(db, alex, 'delete from public.events')).count).toBe(0);
    });

    it('never lets a client write week results', async () => {
      const ins = await as(
        db,
        alex,
        `insert into public.week_results (season_id, user_id, week_index, points_total, breakdown, rules_version)
         values ($1, $2, 1, 99, '{}', 'v1')`,
        [seasonA, alex],
      );
      expect(ins.code).toBe(RLS_VIOLATION);
      expect((await as(db, alex, 'update public.week_results set points_total = 99')).count).toBe(
        0,
      );
      expect((await as(db, alex, 'delete from public.week_results')).count).toBe(0);
    });
  });

  describe('profiles', () => {
    it('is created automatically when someone signs up', async () => {
      await asAdmin(db, async () => {
        await db.query(`insert into auth.users (id, email) values ($1, 'newbie@example.com')`, [
          id('d1'),
        ]);
        const r = await db.query('select display_name from public.profiles where id = $1', [
          id('d1'),
        ]);
        expect(r.rows[0]?.display_name).toBe('newbie');
      });
    });

    it('is visible to the owner and to crew mates only', async () => {
      expect(
        (await as(db, priya, 'select * from public.profiles where id = $1', [alex])).count,
      ).toBe(1);
      expect(
        (await as(db, priya, 'select * from public.profiles where id = $1', [sam])).count,
      ).toBe(0);
      expect((await as(db, eve, 'select * from public.profiles')).count).toBe(1);
    });

    it('can be edited by its owner only', async () => {
      const own = await as(
        db,
        priya,
        `update public.profiles set display_name = 'Pri' where id = $1`,
        [priya],
      );
      expect(own.count).toBe(1);
      const other = await as(
        db,
        priya,
        `update public.profiles set display_name = 'Hax' where id = $1`,
        [alex],
      );
      expect(other.count).toBe(0);
      const empty = await as(
        db,
        priya,
        `update public.profiles set display_name = '  ' where id = $1`,
        [priya],
      );
      expect(empty.code).toBe(CHECK_VIOLATION);
    });
  });

  describe('account deletion', () => {
    it('removes a member and everything they own', async () => {
      await asAdmin(db, async () => {
        await db.query('delete from auth.users where id = $1', [priya]);
        for (const [table, col] of [
          ['profiles', 'id'],
          ['crew_members', 'user_id'],
          ['season_members', 'user_id'],
          ['weekly_plans', 'user_id'],
          ['activities', 'user_id'],
        ] as const) {
          const r = await db.query(
            `select count(*)::int as n from public.${table} where ${col} = $1`,
            [priya],
          );
          expect(r.rows[0]?.n, table).toBe(0);
        }
        const others = await db.query(
          'select count(*)::int as n from public.activities where user_id = $1',
          [alex],
        );
        expect(others.rows[0]?.n).toBe(1);
      });
    });

    it('keeps the crew feed but forgets who acted', async () => {
      await asAdmin(db, async () => {
        await db.query(
          `insert into public.events (crew_id, type, actor_id) values ($1, 'reaction', $2)`,
          [crewA, priya],
        );
        await db.query('delete from auth.users where id = $1', [priya]);
        const r = await db.query(`select actor_id from public.events where type = 'reaction'`);
        expect(r.rows).toEqual([{ actor_id: null }]);
      });
    });

    it('refuses to delete an organiser until their crew is dealt with', async () => {
      await db.query('begin');
      try {
        const r = await attempt(db, 'delete from auth.users where id = $1', [alex]);
        expect(r.code).toBe(FK_VIOLATION);
      } finally {
        await db.query('rollback');
      }
    });
  });
});
