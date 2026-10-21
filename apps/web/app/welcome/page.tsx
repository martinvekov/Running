import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NotConnected } from '@/components/not-connected';
import { requireUser } from '@/lib/auth';
import { cleanDisplayName, MAX_NAME_LENGTH, suggestDisplayName } from '@/lib/names';
import { safeNext } from '@/lib/next-path';
import { SubmitButton } from '@/components/submit-button';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Welcome · Crew Seasons' };
export const dynamic = 'force-dynamic';

async function saveName(formData: FormData) {
  'use server';
  const target = safeNext(String(formData.get('next') ?? ''));
  const name = cleanDisplayName(formData.get('name'));
  const back = `/welcome?next=${encodeURIComponent(target)}`;
  if (!name) redirect(`${back}&error=name`);

  const { supabase, user } = await requireUser(back);
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', user.id);
  if (error) redirect(`${back}&error=save`);
  await supabase.auth.updateUser({ data: { onboarded: true } });
  redirect(target);
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { next, error } = await searchParams;
  const dest = safeNext(next);
  const { user } = await requireUser(`/welcome?next=${encodeURIComponent(dest)}`);
  const suggested = suggestDisplayName(user.user_metadata ?? {}, user.email);

  return (
    <main className="page landing">
      <p className="eyebrow">Welcome</p>
      <h1 className="display">What should your crew call you?</h1>
      <form action={saveName} className="stack">
        <input type="hidden" name="next" value={dest} />
        <label className="field">
          <span>Your name</span>
          <input
            name="name"
            defaultValue={suggested}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="given-name"
            required
          />
        </label>
        {error === 'name' && <p className="error-note">Enter a name up to 40 characters.</p>}
        {error === 'save' && (
          <p className="error-note">Couldn&apos;t save that. Please try again.</p>
        )}
        <SubmitButton className="btn-primary" pending="Saving…">
          Continue
        </SubmitButton>
      </form>
    </main>
  );
}
