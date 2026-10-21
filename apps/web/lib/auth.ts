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

/**
 * Just the signed-in user's id, checked from the session's signed token without a round trip to
 * Supabase when the project signs tokens with a public key. Falls back to asking Supabase.
 * Crew pages use this, since they only need to know who is asking. Row Level Security still
 * decides what they can see.
 */
export async function requireUserId(next: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  let id = typeof claims?.claims?.sub === 'string' ? claims.claims.sub : null;
  if (!id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    id = user?.id ?? null;
  }
  if (!id) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return { supabase, user: { id } };
}
