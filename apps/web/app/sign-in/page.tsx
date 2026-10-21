import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NotConnected } from '@/components/not-connected';
import { safeNext } from '@/lib/next-path';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { SignInButton } from './sign-in-button';

export const metadata: Metadata = { title: 'Sign in · Crew Seasons' };
export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { next, error } = await searchParams;
  const dest = safeNext(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(dest);

  const invited = dest.startsWith('/join/');
  return (
    <main className="page landing">
      <p className="eyebrow">Crew Seasons</p>
      <h1 className="display">{invited ? "You're invited." : 'Sign in.'}</h1>
      <p className="muted">
        {invited
          ? 'Sign in to join the crew. It takes a few seconds.'
          : 'Use your Google account. We only see your name and email.'}
      </p>
      {error && <p className="error-note">Sign-in didn&apos;t complete. Please try again.</p>}
      <SignInButton next={dest} />
      <Link href="/demo" className="link-quiet">
        Or look at the demo season
      </Link>
    </main>
  );
}
