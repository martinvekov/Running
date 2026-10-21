import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

/** The signed-in user, or a redirect to sign in that brings them back to `next` afterwards. */
export async function requireUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
