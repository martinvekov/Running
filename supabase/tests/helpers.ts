import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

export const adminUrl =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

/** True if a Postgres server answers at DATABASE_URL (or the local default). */
export async function canConnect(): Promise<boolean> {
  const client = new pg.Client({ connectionString: adminUrl, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

export interface TestDb {
  db: pg.Client;
  drop(): Promise<void>;
}

/** A throwaway database with the Supabase shim and every migration applied. */
export async function createTestDb(): Promise<TestDb> {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  const name = `crew_test_${process.pid}_${Date.now()}`;
  await admin.query(`create database ${name}`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();

  await db.query(readFileSync(join(here, 'shim.sql'), 'utf8'));
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    await db.query(readFileSync(join(migrationsDir, file), 'utf8'));
  }

  return {
    db,
    drop: async () => {
      await db.end();
      await admin.query(`drop database ${name} with (force)`);
      await admin.end();
    },
  };
}

export interface Attempt {
  ok: boolean;
  rows: Record<string, unknown>[];
  count: number;
  code?: string | undefined;
  message?: string | undefined;
}

/** Runs one statement behind a savepoint, so a failure does not abort the surrounding test. */
export async function attempt(
  db: pg.Client,
  sql: string,
  params: unknown[] = [],
): Promise<Attempt> {
  await db.query('savepoint attempt');
  try {
    const res = await db.query(sql, params);
    await db.query('release savepoint attempt');
    return { ok: true, rows: res.rows, count: res.rowCount ?? 0 };
  } catch (error) {
    await db.query('rollback to savepoint attempt');
    const e = error as { code?: string; message: string };
    return { ok: false, rows: [], count: 0, code: e.code, message: e.message };
  }
}

/**
 * Runs `fn` inside a transaction as the given signed-in user (or as the anonymous role for
 * `null`), the way Supabase serves an API request. Everything is rolled back afterwards.
 */
export async function asUser<T>(
  db: pg.Client,
  user: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.query('begin');
  try {
    await db.query(`set local role ${user ? 'authenticated' : 'anon'}`);
    if (user) {
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: user, role: 'authenticated' }),
      ]);
    }
    return await fn();
  } finally {
    await db.query('rollback');
  }
}

/** One statement as one user. */
export function as(db: pg.Client, user: string | null, sql: string, params: unknown[] = []) {
  return asUser(db, user, () => attempt(db, sql, params));
}

/** Runs `fn` as the database owner (bypassing the access rules) and rolls back. */
export async function asAdmin<T>(db: pg.Client, fn: () => Promise<T>): Promise<T> {
  await db.query('begin');
  try {
    return await fn();
  } finally {
    await db.query('rollback');
  }
}
