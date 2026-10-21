import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The sync talks to Strava and the database; both are replaced here to check what it writes.

const inserted: Record<string, unknown>[][] = [];
let existingRefs: string[] = [];
let claimResult: unknown = null;

function builder(table: string) {
  const state = { op: 'select' };
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = () => b;
  b.update = () => {
    state.op = 'update';
    return b;
  };
  b.eq = chain;
  b.or = chain;
  b.in = () =>
    table === 'activities'
      ? Promise.resolve({ data: existingRefs.map((s) => ({ source_ref: s })) })
      : b;
  b.maybeSingle = () => Promise.resolve({ data: claimResult });
  b.insert = (rows: Record<string, unknown>[]) => {
    inserted.push(rows);
    return Promise.resolve({ error: null });
  };
  b.then = (resolve: (v: unknown) => void) => resolve({ data: null });
  return b;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}));

const run = (id: number, type = 'Run') => ({
  id,
  sport_type: type,
  start_date: '2026-11-03T06:30:00Z',
  start_date_local: '2026-11-03T06:30:00Z',
  moving_time: 1800,
  elapsed_time: 1800,
  distance: 5000,
});

beforeEach(() => {
  inserted.length = 0;
  existingRefs = [];
  claimResult = {
    user_id: 'u1',
    access_token: 'tok',
    refresh_token: 'ref',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  };
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://db.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'secret');
  vi.stubEnv('STRAVA_CLIENT_ID', '1');
  vi.stubEnv('STRAVA_CLIENT_SECRET', 'shh');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('syncStrava', () => {
  it('imports new runs as strava activities with their recording time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([run(1), run(2, 'Ride'), run(3)])),
    );
    const { syncStrava } = await import('./strava-sync');
    await syncStrava(['u1'], '2026-11-02');
    expect(inserted).toHaveLength(1);
    expect(inserted[0]!.map((r) => r.source_ref)).toEqual(['1', '3']);
    expect(inserted[0]![0]).toMatchObject({
      user_id: 'u1',
      source: 'strava',
      run_date: '2026-11-03',
      duration_s: 1800,
      distance_m: 5000,
      link_url: 'https://www.strava.com/activities/1',
      created_at: '2026-11-03T07:00:00.000Z',
    });
    expect(Object.keys(inserted[0]![0]!).sort()).toEqual([
      'created_at',
      'distance_m',
      'duration_s',
      'link_url',
      'run_date',
      'source',
      'source_ref',
      'user_id',
    ]);
  });

  it('skips runs it already has', async () => {
    existingRefs = ['1'];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([run(1), run(3)])),
    );
    const { syncStrava } = await import('./strava-sync');
    await syncStrava(['u1'], '2026-11-02');
    expect(inserted[0]!.map((r) => r.source_ref)).toEqual(['3']);
  });

  it('does nothing if the runner was synced recently', async () => {
    claimResult = null;
    const fetchMock = vi.fn(async () => Response.json([run(1)]));
    vi.stubGlobal('fetch', fetchMock);
    const { syncStrava } = await import('./strava-sync');
    await syncStrava(['u1'], '2026-11-02');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
  });

  it('does not throw when Strava is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({}, { status: 500 })),
    );
    const { syncStrava } = await import('./strava-sync');
    await expect(syncStrava(['u1'], '2026-11-02')).resolves.toBeUndefined();
    expect(inserted).toHaveLength(0);
  });

  it('does nothing when the keys are not set', async () => {
    vi.stubEnv('STRAVA_CLIENT_SECRET', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { syncStrava } = await import('./strava-sync');
    await syncStrava(['u1'], '2026-11-02');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
