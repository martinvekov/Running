import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/avatar';
import { CopyButton } from '@/components/copy-button';
import { NotConnected } from '@/components/not-connected';
import { requireUser } from '@/lib/auth';
import { inviteMessage, inviteUrl, whatsappShareUrl } from '@/lib/invite';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Crew · Crew Seasons' };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MemberRow {
  user_id: string;
  role: 'organiser' | 'member';
  profiles: { display_name: string } | { display_name: string }[] | null;
}

function nameOf(member: MemberRow): string {
  const p = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
  return p?.display_name ?? 'Runner';
}

export default async function CrewPage({ params }: { params: Promise<{ crewId: string }> }) {
  if (!supabaseEnv()) return <NotConnected />;
  const { crewId } = await params;
  if (!UUID.test(crewId)) notFound();
  const { supabase, user } = await requireUser(`/c/${crewId}`);

  // Row Level Security means a non-member gets nothing back, which reads as "not found".
  const { data: crew } = await supabase
    .from('crews')
    .select('id, name, invite_code, organiser_id')
    .eq('id', crewId)
    .maybeSingle();
  if (!crew) notFound();

  const { data: members } = await supabase
    .from('crew_members')
    .select('user_id, role, profiles(display_name)')
    .eq('crew_id', crewId)
    .order('joined_at');
  const people = (members ?? []) as MemberRow[];

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const link = inviteUrl(`${proto}://${host}`, crew.invite_code as string);

  return (
    <main className="page">
      <Link href="/" className="back">
        ← Your crews
      </Link>
      <header className="masthead">
        <h1>{crew.name as string}</h1>
        <p className="masthead-meta">
          {people.length} {people.length === 1 ? 'runner' : 'runners'}
          {crew.organiser_id === user.id ? ' · you organise this crew' : ''}
        </p>
      </header>

      <section className="section">
        <div className="section-head">
          <span className="label">Invite friends</span>
        </div>
        <p className="note">Anyone with this link can join. Share it in your group chat.</p>
        <input className="link-field" readOnly value={link} aria-label="Invite link" />
        <div className="button-row">
          <a
            className="btn-primary"
            href={whatsappShareUrl(inviteMessage(crew.name as string, link))}
            target="_blank"
            rel="noopener"
          >
            Share on WhatsApp
          </a>
          <CopyButton text={link} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="label">Runners</span>
        </div>
        <ul className="member-list">
          {people.map((m) => (
            <li key={m.user_id}>
              <Avatar name={nameOf(m)} />
              <span>
                {nameOf(m)}
                {m.user_id === user.id ? ' (you)' : ''}
              </span>
              {m.role === 'organiser' && <span className="chip">Organiser</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
