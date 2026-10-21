import { describe, expect, it } from 'vitest';
import { mapStravaActivity, stravaAuthorizeUrl, tokenNeedsRefresh } from './strava';

const run = {
  id: 123456789,
  sport_type: 'Run',
  start_date: '2026-11-03T06:30:00Z',
  start_date_local: '2026-11-03T06:30:00Z',
  moving_time: 2520,
  elapsed_time: 2600,
  distance: 8012.4,
};

describe('mapStravaActivity', () => {
  it('maps a run to the fields we store', () => {
    expect(mapStravaActivity(run)).toEqual({
      sourceRef: '123456789',
      runDate: '2026-11-03',
      durationS: 2520,
      distanceM: 8012,
      linkUrl: 'https://www.strava.com/activities/123456789',
      recordedAt: '2026-11-03T07:13:20.000Z',
    });
  });

  it('uses the local date, so a late-night run stays on its own day', () => {
    const r = mapStravaActivity({
      ...run,
      start_date: '2026-11-03T23:30:00Z',
      start_date_local: '2026-11-04T00:30:00Z',
    });
    expect(r?.runDate).toBe('2026-11-04');
  });

  it('accepts trail runs and falls back to the older type field', () => {
    expect(mapStravaActivity({ ...run, sport_type: 'TrailRun' })).not.toBeNull();
    const older: Record<string, unknown> = { ...run, type: 'Run' };
    delete older.sport_type;
    expect(mapStravaActivity(older as typeof run)).not.toBeNull();
  });

  it('skips rides, walks and malformed activities', () => {
    expect(mapStravaActivity({ ...run, sport_type: 'Ride' })).toBeNull();
    expect(mapStravaActivity({ ...run, sport_type: 'Walk' })).toBeNull();
    expect(mapStravaActivity({ ...run, moving_time: 0 })).toBeNull();
    expect(mapStravaActivity({ ...run, start_date: 'nope' })).toBeNull();
    expect(mapStravaActivity({ ...run, distance: 999_999 })).toBeNull();
    expect(mapStravaActivity({ ...run, id: 0 })).toBeNull();
  });

  it('does not keep anything beyond the brief', () => {
    const r = mapStravaActivity({
      ...run,
      ...{ map: { summary_polyline: 'abc' }, average_heartrate: 150 },
    });
    expect(Object.keys(r!).sort()).toEqual([
      'distanceM',
      'durationS',
      'linkUrl',
      'recordedAt',
      'runDate',
      'sourceRef',
    ]);
  });
});

describe('stravaAuthorizeUrl', () => {
  it('asks only to read activities and carries the state', () => {
    const url = new URL(
      stravaAuthorizeUrl({
        clientId: '42',
        redirectUri: 'https://x.app/api/strava/callback',
        state: 's1',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe('activity:read');
    expect(url.searchParams.get('state')).toBe('s1');
    expect(url.searchParams.get('client_id')).toBe('42');
    expect(url.searchParams.get('redirect_uri')).toBe('https://x.app/api/strava/callback');
  });
});

describe('tokenNeedsRefresh', () => {
  it('refreshes when expired or within a minute of expiring', () => {
    const now = Date.parse('2026-11-03T10:00:00Z');
    expect(tokenNeedsRefresh('2026-11-03T09:59:00Z', now)).toBe(true);
    expect(tokenNeedsRefresh('2026-11-03T10:00:30Z', now)).toBe(true);
    expect(tokenNeedsRefresh('2026-11-03T11:00:00Z', now)).toBe(false);
  });
});
