import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { as, asUser, attempt, canConnect, createTestDb, type TestDb } from './helpers';

// Likes and comments on runs. You can only reach a run you can already see, you can only act as
// yourself, and you can take back your own like or comment and nobody else's.

const id = (n: string) => `00000000-0000-0000-0000-${n.padStart(12, '0')}`;
const alex = id('a1');
const priya = id('a2');
const sam = id('b1'); // in a different crew
const alexRun = id('3001');
const priyaRun = id('3002');

const available = await canConnect();
if (!available && process.env.CI) {
  throw new Error('CI must provide a Postgres server at DATABASE_URL for the policy tests');
}

describe.skipIf(!available)('run likes and comments', () => {
  let t: TestDb;
  let db: TestDb['db'];

  beforeAll(async () => {
    t = await createTestDb();
    db = t.db;
    await db.query(`
      insert into auth.users (id, email) values
        ('${alex}', 'alex@example.com'), ('${priya}', 'priya@example.com'), ('${sam}', 'sam@example.com');
      insert into public.crews (id, name, organiser_id) values
        ('${id('1001')}', 'Crew A', '${alex}'), ('${id('1002')}', 'Crew B', '${sam}');
      insert into public.crew_members (crew_id, user_id, role) values
        ('${id('1001')}', '${alex}', 'organiser'), ('${id('1001')}', '${priya}', 'member'),
        ('${id('1002')}', '${sam}', 'organiser');
      insert into public.activities (id, user_id, source, run_date, duration_s, distance_m) values
        ('${alexRun}', '${alex}', 'manual', '2026-11-03', 1800, 5000),
        ('${priyaRun}', '${priya}', 'manual', '2026-11-04', 1800, 5000),
        ('${id('3003')}', '${sam}', 'manual', '2026-11-04', 1800, 5000);
    `);
  });

  beforeEach(async () => {
    await db.query('delete from public.run_likes; delete from public.run_comments;');
  });

  afterAll(async () => {
    await t?.drop();
  });

  const insertLike = (run: string, as_: string) =>
    attempt(db, 'insert into public.run_likes (activity_id, user_id) values ($1, $2)', [run, as_]);
  const insertComment = (run: string, as_: string, body: string) =>
    attempt(
      db,
      'insert into public.run_comments (activity_id, user_id, body) values ($1, $2, $3)',
      [run, as_, body],
    );
  const seedLike = (run: string, user: string) =>
    db.query('insert into public.run_likes (activity_id, user_id) values ($1, $2)', [run, user]);
  const seedComment = (run: string, user: string, body: string, ago = '0 minutes') =>
    db.query(
      `insert into public.run_comments (activity_id, user_id, body, created_at)
       values ($1, $2, $3, now() - $4::interval)`,
      [run, user, body, ago],
    );

  describe('likes', () => {
    it('lets you like a crew mate’s run, and they can see who liked it', async () => {
      const liked = await asUser(db, priya, () => insertLike(alexRun, priya));
      expect(liked.ok, liked.message).toBe(true);
      await seedLike(alexRun, priya);
      const seen = await as(
        db,
        alex,
        'select user_id from public.run_likes where activity_id = $1',
        [alexRun],
      );
      expect(seen.rows.map((x) => x.user_id)).toEqual([priya]);
    });

    it('refuses a second like from the same person', async () => {
      await seedLike(alexRun, priya);
      const again = await asUser(db, priya, () => insertLike(alexRun, priya));
      expect(again.ok).toBe(false);
    });

    it('does not let you like as someone else', async () => {
      const r = await asUser(db, priya, () => insertLike(alexRun, alex));
      expect(r.ok).toBe(false);
    });

    it('does not let an outsider like or see likes on a crew’s run', async () => {
      expect((await asUser(db, sam, () => insertLike(alexRun, sam))).ok).toBe(false);
      await seedLike(alexRun, priya);
      const seen = await as(db, sam, 'select * from public.run_likes');
      expect(seen.rows).toEqual([]);
    });

    it('lets you take back your own like and nobody else’s', async () => {
      await seedLike(alexRun, priya);
      const others = await as(db, alex, 'delete from public.run_likes where user_id = $1', [priya]);
      expect(others.count).toBe(0);
      const own = await as(db, priya, 'delete from public.run_likes where user_id = $1', [priya]);
      expect(own.count).toBe(1);
    });
  });

  describe('comments', () => {
    it('lets you comment on a crew mate’s run, and they can read it', async () => {
      const r = await asUser(db, priya, () => insertComment(alexRun, priya, 'Strong run'));
      expect(r.ok, r.message).toBe(true);
      await seedComment(alexRun, priya, 'Strong run');
      const seen = await as(db, alex, 'select body from public.run_comments');
      expect(seen.rows.map((x) => x.body)).toEqual(['Strong run']);
    });

    it('does not let you comment as someone else', async () => {
      const r = await asUser(db, priya, () => insertComment(alexRun, alex, 'hi'));
      expect(r.ok).toBe(false);
    });

    it('does not let an outsider comment on, or read comments about, a crew’s run', async () => {
      expect((await asUser(db, sam, () => insertComment(alexRun, sam, 'hello'))).ok).toBe(false);
      await seedComment(alexRun, priya, 'Strong run');
      const seen = await as(db, sam, 'select * from public.run_comments');
      expect(seen.rows).toEqual([]);
    });

    it('rejects empty, blank and over-long comments', async () => {
      const results = await asUser(db, priya, async () => [
        await insertComment(alexRun, priya, ''),
        await insertComment(alexRun, priya, '   '),
        await insertComment(alexRun, priya, 'x'.repeat(281)),
        await insertComment(alexRun, priya, 'x'.repeat(280)),
      ]);
      expect(results.map((r) => r.ok)).toEqual([false, false, false, true]);
    });

    it('stamps the time on the server', async () => {
      const r = await as(
        db,
        priya,
        `insert into public.run_comments (activity_id, user_id, body, created_at)
         values ($1, $2, 'back-dated', '2020-01-01')`,
        [alexRun, priya],
      );
      expect(r.ok).toBe(false);
    });

    it('lets you delete your own comment and nobody else’s', async () => {
      await seedComment(alexRun, priya, 'Strong run');
      const others = await as(db, alex, 'delete from public.run_comments');
      expect(others.count).toBe(0);
      const own = await as(db, priya, 'delete from public.run_comments');
      expect(own.count).toBe(1);
    });

    it('does not let anyone edit a comment', async () => {
      await seedComment(alexRun, priya, 'Strong run');
      const r = await as(db, priya, `update public.run_comments set body = 'changed'`);
      expect(r.ok).toBe(false);
    });

    it('gives the signed-out role nothing', async () => {
      expect((await as(db, null, 'select * from public.run_comments')).ok).toBe(false);
      expect((await as(db, null, 'select * from public.run_likes')).ok).toBe(false);
    });
  });

  describe('run_social', () => {
    it('summarises likes, comment count and the latest comment for runs you can see', async () => {
      await seedLike(alexRun, priya);
      await seedLike(alexRun, alex);
      await seedComment(alexRun, priya, 'first', '2 minutes');
      await seedComment(alexRun, alex, 'thanks', '1 minute');
      const r = await as(db, priya, 'select public.run_social($1::uuid[]) as s', [
        [alexRun, priyaRun],
      ]);
      expect(r.ok, r.message).toBe(true);
      const s = r.rows[0]!.s as Record<
        string,
        {
          likes: { userId: string; name: string }[];
          commentCount: number;
          latest: { body: string; name: string; userId: string } | null;
        }
      >;
      expect(s[alexRun]!.likes.map((l) => l.userId).sort()).toEqual([alex, priya].sort());
      expect(s[alexRun]!.likes[0]!.name).toBeTruthy();
      expect(s[alexRun]!.commentCount).toBe(2);
      expect(s[alexRun]!.latest).toMatchObject({ body: 'thanks', userId: alex });
      expect(s[priyaRun]).toMatchObject({ likes: [], commentCount: 0, latest: null });
    });

    it('says nothing about runs you cannot see', async () => {
      await seedLike(alexRun, priya);
      const r = await as(db, sam, 'select public.run_social($1::uuid[]) as s', [[alexRun]]);
      expect(r.ok, r.message).toBe(true);
      expect(r.rows[0]!.s).toEqual({});
    });

    it('refuses a signed-out caller', async () => {
      const r = await as(db, null, 'select public.run_social($1::uuid[])', [[alexRun]]);
      expect(r.ok).toBe(false);
    });
  });

  it('removes likes and comments when the run is deleted', async () => {
    await seedLike(priyaRun, alex);
    await seedComment(priyaRun, alex, 'nice');
    await db.query('delete from public.activities where id = $1', [priyaRun]);
    const left = await db.query(
      `select (select count(*) from public.run_likes where activity_id = $1) as l,
              (select count(*) from public.run_comments where activity_id = $1) as c`,
      [priyaRun],
    );
    expect(left.rows[0]).toEqual({ l: '0', c: '0' });
    await db.query(
      `insert into public.activities (id, user_id, source, run_date, duration_s, distance_m)
       values ($1, $2, 'manual', '2026-11-04', 1800, 5000)`,
      [priyaRun, priya],
    );
  });
});
