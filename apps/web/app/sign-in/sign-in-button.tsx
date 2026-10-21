'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function SignInButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={signIn} disabled={busy}>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {failed && <p className="error-note">Couldn&apos;t start sign-in. Try again in a moment.</p>}
    </>
  );
}
