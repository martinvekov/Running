import { NextResponse, type NextRequest } from 'next/server';
import { getCrewContext } from '@/lib/season-data';
import { lookBackWindow } from '@/lib/lookback-window';
import { outcomeQuery } from '@/lib/strava-outcome';
import { adminClient, exchangeCode, syncStrava } from '@/lib/strava-sync';
import { londonDate } from '@crew/engine';

export const dynamic = 'force-dynamic';

/** Where Strava sends the runner back: save their connection and bring in their runs. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get('state') ?? '';
  const expected = request.cookies.get('strava_state')?.value;
  const [, crewId = '', target = 'log'] = state.split('.');
  const page = target === 'preseason' ? 'preseason' : 'log';
  const back = (query: string) =>
    NextResponse.redirect(new URL(`/c/${crewId}/${page}?${query}`, request.url));

  if (!expected || state !== expected) return back('error=strava');
  const { user, season } = await getCrewContext(crewId);
  if (params.get('error') || !params.get('code')) return back('error=strava-denied');
  // Strava lets people untick what they share. Without activity access there is nothing to read.
  const scope = params.get('scope');
  if (scope && !scope.split(',').includes('activity:read')) {
    return back('strava=no-access&http=403');
  }

  const admin = adminClient();
  const tokens = await exchangeCode(params.get('code')!);
  if (!admin || !tokens?.athlete) return back('error=strava');

  const { error } = await admin.from('strava_connections').upsert({
    user_id: user.id,
    athlete_id: tokens.athlete.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    last_synced_at: null,
  });
  if (error) return back('error=strava');

  let query = 'saved=strava';
  if (page === 'preseason') {
    const w = lookBackWindow(londonDate(new Date().toISOString()));
    query = outcomeQuery(await syncStrava([user.id], w.historyFrom, { force: true, maxPages: 10 }));
  } else if (season && season.status !== 'closed') {
    await syncStrava([user.id], season.start_date, { force: true });
  }
  const response = back(query);
  response.cookies.delete({ name: 'strava_state', path: '/api/strava' });
  return response;
}
