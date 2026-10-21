import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NotConnected } from '@/components/not-connected';
import {
  cleanEmail,
  cleanPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '@/lib/credentials';
import { cleanDisplayName, MAX_NAME_LENGTH } from '@/lib/names';
import { safeNext } from '@/lib/next-path';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { SignInButton } from './sign-in-button';

export const metadata: Metadata = { title: 'Sign in · Crew Seasons' };
export const dynamic = 'force-dynamic';

// Google sign-in only lets listed test users in until the app is published, so it stays off
// unless someone turns it on.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === 'true';

async function authenticate(formData: FormData) {
  'use server';
  const mode = formData.get('mode') === 'create' ? 'create' : 'signin';
  const next = safeNext(String(formData.get('next') ?? ''));
  const back = (error: string) =>
    `/sign-in?mode=${mode}&next=${encodeURIComponent(next)}&error=${error}`;

  const email = cleanEmail(formData.get('email'));
  if (!email) redirect(back('email'));
  const supabase = await createClient();

  if (mode === 'create') {
    const name = cleanDisplayName(formData.get('name'));
    if (!name) redirect(back('name'));
    const password = cleanPassword(formData.get('password'));
    if (!password) redirect(back('password'));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, onboarded: true } },
    });
    if (error) {
      redirect(
        back(
          error.code === 'user_already_exists'
            ? 'exists'
            : error.code === 'weak_password'
              ? 'password'
              : 'failed',
        ),
      );
    }
    // No session means the project still wants an email confirmed first.
    if (!data.session) redirect(back('confirm'));
    redirect(next);
  }

  const password = formData.get('password');
  if (typeof password !== 'string' || password.length === 0) redirect(back('credentials'));
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(back(error.code === 'invalid_credentials' ? 'credentials' : 'failed'));
  redirect(data.user.user_metadata?.onboarded ? next : `/welcome?next=${encodeURIComponent(next)}`);
}

const MESSAGES: Record<string, string> = {
  email: 'Enter a valid email address.',
  name: `Enter a name up to ${MAX_NAME_LENGTH} characters.`,
  password: `Use ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters for your password.`,
  exists: 'That email already has an account. Sign in instead.',
  credentials: 'That email and password don’t match.',
  confirm:
    'Sign-up is waiting on an email confirmation that isn’t switched off yet. Tell whoever runs this crew.',
  failed: 'Something went wrong. Please try again.',
  '1': 'Sign-in didn’t complete. Please try again.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { next, error, mode: rawMode } = await searchParams;
  const dest = safeNext(next);
  const mode = rawMode === 'create' ? 'create' : 'signin';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(dest);

  const invited = dest.startsWith('/join/');
  const tab = (m: 'signin' | 'create') => `/sign-in?mode=${m}&next=${encodeURIComponent(dest)}`;

  return (
    <main className="page auth-page">
      <p className="eyebrow">Crew Seasons</p>
      <h1 className="display">
        {invited ? "You're invited." : mode === 'create' ? 'Create your account.' : 'Welcome back.'}
      </h1>
      <p className="muted">
        {invited
          ? 'Make an account to join the crew. It takes a few seconds.'
          : 'Your crew sees your name and the runs you log.'}
      </p>

      <nav className="seg" aria-label="Sign in or create an account">
        <Link href={tab('create')} className={mode === 'create' ? 'seg-item active' : 'seg-item'}>
          Create account
        </Link>
        <Link href={tab('signin')} className={mode === 'signin' ? 'seg-item active' : 'seg-item'}>
          Sign in
        </Link>
      </nav>

      <form action={authenticate} className="stack">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={dest} />
        {mode === 'create' && (
          <label className="field">
            <span>Your name</span>
            <input
              name="name"
              autoComplete="given-name"
              maxLength={MAX_NAME_LENGTH}
              placeholder="What your crew calls you"
              required
            />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" inputMode="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            minLength={mode === 'create' ? MIN_PASSWORD_LENGTH : undefined}
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />
        </label>
        {error && <p className="error-note">{MESSAGES[error] ?? MESSAGES.failed}</p>}
        <button type="submit" className="btn-primary">
          {mode === 'create' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {GOOGLE_ENABLED && (
        <div className="stack">
          <p className="muted small">or</p>
          <SignInButton next={dest} />
        </div>
      )}

      <Link href="/demo" className="link-quiet">
        Or look at the demo season
      </Link>
    </main>
  );
}
