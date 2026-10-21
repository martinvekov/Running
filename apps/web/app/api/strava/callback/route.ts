import { NextResponse, type NextRequest } from 'next/server';
import { getCrewContext } from '@/lib/season-data';
import { adminClient, exchangeCode, syncStrava } from '@/lib/strava-sync';

export const dynamic = 'force-dynamic';

/** Where Strava sends the runner back: save their connection and bring in their runs. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get('state') ?? '';
  const expected = request.cookies.get('strava_state')?.value;
  const crewId = state.split('.')[1] ?? '';
  const back = (query: string) =>
    NextResponse.redirect(new URL(`/c/${crewId}/log?${query}`, request.url));

  if (!expected || state !== expected) return back('error=strava');
  const { user, season } = await getCrewContext(crewId);
  if (params.get('error') || !params.get('code')) return back('error=strava-denied');

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

  if (season && season.status !== 'closed') {
    await syncStrava([user.id], season.start_date, { force: true });
  }
  const response = back('saved=strava');
  response.cookies.delete({ name: 'strava_state', path: '/api/strava' });
  return response;
}
