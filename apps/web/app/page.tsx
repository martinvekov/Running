import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function Landing({ connected }: { connected: boolean }) {
  return (
    <main className="page landing">
      <p className="eyebrow">Crew Seasons</p>
      <h1 className="display">
        Three weeks.
        <br />
        Your crew.
        <br />
        Anyone can win.
      </h1>
      <p className="muted">
        Commit to your runs every Sunday, keep your word, win your duel. Everyone is scored against
        their own baseline, so pace never matters.
      </p>
      {connected && (
        <>
          <Link href="/sign-in?mode=create" className="btn-primary">
            Create account
          </Link>
          <Link href="/sign-in" className="link-quiet">
            I already have an account
          </Link>
        </>
      )}
      <Link href="/demo" className={connected ? 'link-quiet' : 'cta'}>
        {connected ? 'Or look at the demo season' : 'View the demo season'}
      </Link>
    </main>
  );
}

export default async function Home() {
  if (!supabaseEnv()) return <Landing connected={false} />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Landing connected />;

  const [{ data: profile }, { data: crews }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    supabase.from('crews').select('id, name').order('created_at'),
  ]);
  const name = (profile?.display_name as string | undefined) ?? 'Runner';
  const list = (crews ?? []) as { id: string; name: string }[];

  return (
    <main className="page">
      <header className="masthead">
        <div className="masthead-top">
          <span className="label">Crew Seasons</span>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="link-quiet">
              Sign out
            </button>
          </form>
        </div>
        <h1>Hi, {name}</h1>
        <p className="masthead-meta">
          {list.length > 0
            ? 'Your crews'
            : 'Ask a friend for their invite link, or start a crew of your own.'}
        </p>
      </header>

      {list.length > 0 && (
        <ul className="crew-list">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.id}`} className="crew-link">
                <Avatar name={c.name} size={40} />
                <strong>{c.name}</strong>
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/crews/new" className="btn-primary">
        Start a crew
      </Link>
      <Link href="/demo" className="link-quiet">
        Look at the demo season
      </Link>
    </main>
  );
}
