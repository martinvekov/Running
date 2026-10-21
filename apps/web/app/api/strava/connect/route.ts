import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/lib/origin';
import { getCrewContext } from '@/lib/season-data';
import { stravaAuthorizeUrl } from '@/lib/strava';
import { stravaConfig } from '@/lib/strava-sync';

export const dynamic = 'force-dynamic';

/** Starts "Connect Strava": sends the signed-in runner to Strava to approve read access. */
export async function GET(request: NextRequest) {
  const config = stravaConfig();
  const crewId = request.nextUrl.searchParams.get('crew') ?? '';
  // Checks the person is signed in and belongs to this crew.
  await getCrewContext(crewId);
  if (!config) return NextResponse.redirect(new URL(`/c/${crewId}/log?error=strava`, request.url));

  const origin = await requestOrigin();
  const to = request.nextUrl.searchParams.get('to') === 'preseason' ? 'preseason' : 'log';
  const state = `${randomUUID()}.${crewId}.${to}`;
  const response = NextResponse.redirect(
    stravaAuthorizeUrl({
      clientId: config.clientId,
      redirectUri: `${origin}/api/strava/callback`,
      state,
    }),
  );
  response.cookies.set('strava_state', state, {
    httpOnly: true,
    secure: origin.startsWith('https'),
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/strava',
  });
  return response;
}
