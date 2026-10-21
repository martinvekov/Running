import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/next-path';
import { createClient } from '@/lib/supabase/server';

// Google sends people back here with a one-time code, which we swap for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const destination = user?.user_metadata?.onboarded
        ? next
        : `/welcome?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }
  return NextResponse.redirect(`${origin}/sign-in?error=1`);
}
