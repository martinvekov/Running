import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NotConnected } from '@/components/not-connected';
import { requireUser } from '@/lib/auth';
import { cleanCrewName, MAX_CREW_NAME_LENGTH } from '@/lib/names';
import { SubmitButton } from '@/components/submit-button';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'New crew · Crew Seasons' };
export const dynamic = 'force-dynamic';

async function createCrew(formData: FormData) {
  'use server';
  const name = cleanCrewName(formData.get('name'));
  if (!name) redirect('/crews/new?error=name');

  const { supabase } = await requireUser('/crews/new');
  const { data, error } = await supabase.rpc('create_crew', { p_name: name });
  if (error || !data) redirect('/crews/new?error=save');
  redirect(`/c/${(data as { id: string }).id}`);
}

export default async function NewCrewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { error } = await searchParams;
  await requireUser('/crews/new');

  return (
    <main className="page">
      <Link href="/" className="back">
        ← Back
      </Link>
      <header className="masthead">
        <h1>Start a crew</h1>
        <p className="masthead-meta">You&apos;ll be the organiser. Invite friends with a link.</p>
      </header>
      <form action={createCrew} className="stack">
        <label className="field">
          <span>Crew name</span>
          <input name="name" placeholder="Sunday Club" maxLength={MAX_CREW_NAME_LENGTH} required />
        </label>
        {error === 'name' && <p className="error-note">Enter a name up to 60 characters.</p>}
        {error === 'save' && (
          <p className="error-note">Couldn&apos;t create the crew. Please try again.</p>
        )}
        <SubmitButton className="btn-primary" pending="Creating…">
          Create crew
        </SubmitButton>
      </form>
    </main>
  );
}
