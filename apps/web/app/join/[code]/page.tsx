import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { NotConnected } from '@/components/not-connected';
import { requireUser } from '@/lib/auth';
import { isInviteCode } from '@/lib/invite';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Join a crew · Crew Seasons' };
export const dynamic = 'force-dynamic';

async function joinCrew(formData: FormData) {
  'use server';
  const code = String(formData.get('code') ?? '');
  if (!isInviteCode(code)) notFound();

  const { supabase } = await requireUser(`/join/${code}`);
  const { data, error } = await supabase.rpc('join_crew', { p_code: code });
  if (error || !data) redirect(`/join/${code}?error=1`);
  redirect(`/c/${data as string}`);
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { code } = await params;
  const { error } = await searchParams;
  if (!isInviteCode(code)) notFound();
  await requireUser(`/join/${code}`);

  return (
    <main className="page landing">
      <p className="eyebrow">Crew Seasons</p>
      <h1 className="display">Join this crew?</h1>
      <p className="muted">
        Your crew mates will see your name and the runs you log. You can leave any time.
      </p>
      {error && (
        <p className="error-note">
          That invite link doesn&apos;t work. It may have been replaced. Ask for a new one.
        </p>
      )}
      <form action={joinCrew} className="stack">
        <input type="hidden" name="code" value={code} />
        <button type="submit" className="btn-primary">
          Join crew
        </button>
      </form>
    </main>
  );
}
