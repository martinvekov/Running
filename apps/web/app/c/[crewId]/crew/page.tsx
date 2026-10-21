import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Avatar } from '@/components/avatar';
import { CopyButton } from '@/components/copy-button';
import { NotConnected } from '@/components/not-connected';
import { londonDate } from '@crew/engine';
import { getCrewContext } from '@/lib/season-data';
import { upcomingMondays } from '@/lib/season-forms';
import { formatShortDate } from '@/app/_season/format';
import { planSeason, saveBaseline, startSeason } from '../actions';
import { inviteMessage, inviteUrl, whatsappShareUrl } from '@/lib/invite';
import { supabaseEnv } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Crew · Crew Seasons' };
export const dynamic = 'force-dynamic';

interface MemberRow {
  user_id: string;
  role: 'organiser' | 'member';
  profiles: { display_name: string } | { display_name: string }[] | null;
}

function nameOf(member: MemberRow): string {
  const p = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
  return p?.display_name ?? 'Runner';
}

const ERRORS: Record<string, string> = {
  organiser: 'Only the organiser can do that.',
  'season-open': 'This crew already has a season going.',
  start: 'Pick one of the Mondays listed.',
  bounty: 'Keep each bounty under 80 characters.',
  baseline: 'Enter your usual weekly km (up to 500) and runs (1 to 14).',
  started: 'The season has already started, so usual weeks are locked.',
  few: 'At least two runners need to set their usual week first.',
  save: 'Something went wrong saving that. Please try again.',
};

export default async function CrewPage({
  params,
  searchParams,
}: {
  params: Promise<{ crewId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { crewId } = await params;
  const { error, saved } = await searchParams;
  const { supabase, user, crew, season, isOrganiser } = await getCrewContext(crewId);

  const { data: members } = await supabase
    .from('crew_members')
    .select('user_id, role, profiles(display_name)')
    .eq('crew_id', crewId)
    .order('joined_at');
  const people = (members ?? []) as MemberRow[];

  const { data: baselines } = season
    ? await supabase
        .from('season_members')
        .select('user_id, baseline_km, baseline_runs, profiles(display_name)')
        .eq('season_id', season.id)
    : { data: [] };
  const { data: bounties } = season
    ? await supabase.from('bounties').select('week_index, title').eq('season_id', season.id)
    : { data: [] };
  const mine = (baselines ?? []).find((m) => m.user_id === user.id);
  const today = londonDate(new Date().toISOString());

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const link = inviteUrl(`${proto}://${host}`, crew.invite_code as string);

  return (
    <main className="page">
      <Link href={season && season.status !== 'setup' ? `/c/${crewId}` : '/'} className="back">
        {season && season.status !== 'setup' ? '← Feed' : '← Your crews'}
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
          <span className="label">{season ? `Season ${season.number}` : 'Season'}</span>
          {season && <span className="chip">{season.status}</span>}
        </div>
        {error && <p className="error-note">{ERRORS[error] ?? ERRORS.save}</p>}
        {saved && <p className="note">Saved.</p>}

        {(!season || season.status === 'closed') &&
          (isOrganiser ? (
            <form action={planSeason} className="stack">
              <input type="hidden" name="crewId" value={crewId} />
              <p className="note">
                A season is three weeks. Pick the Monday it starts and, if you like, a bounty for
                each week: a challenge worth 5 points, like a run before 7am.
              </p>
              <label className="field">
                <span>Starts on</span>
                <select name="start" required>
                  {upcomingMondays(today, 6).map((d) => (
                    <option key={d} value={d}>
                      {formatShortDate(d)}
                    </option>
                  ))}
                </select>
              </label>
              {[0, 1, 2].map((i) => (
                <label key={i} className="field">
                  <span>Week {i + 1} bounty (optional)</span>
                  <input name={`bounty${i}`} maxLength={80} placeholder="A run before 7am" />
                </label>
              ))}
              <button type="submit" className="btn-primary">
                Plan season {(season?.number ?? 0) + 1}
              </button>
            </form>
          ) : (
            <p className="note">Waiting for the organiser to plan the next season.</p>
          ))}

        {season?.status === 'setup' && (
          <div className="stack">
            <p className="note">
              Starts {formatShortDate(season.start_date)}. Tell the crew your usual week: it&apos;s
              your baseline, and you&apos;re scored against it. It locks when the season starts.
            </p>
            {(bounties ?? []).length > 0 && (
              <ul className="member-list">
                {[...(bounties ?? [])]
                  .sort((a, b) => a.week_index - b.week_index)
                  .map((b) => (
                    <li key={b.week_index}>
                      <span>
                        Week {b.week_index + 1}: {b.title}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            <form action={saveBaseline} className="stack">
              <input type="hidden" name="crewId" value={crewId} />
              <label className="field">
                <span>Your usual km in a week</span>
                <input
                  name="km"
                  inputMode="decimal"
                  placeholder="20"
                  defaultValue={mine ? String(mine.baseline_km) : ''}
                  required
                />
              </label>
              <label className="field">
                <span>Your usual runs in a week</span>
                <input
                  name="runs"
                  inputMode="numeric"
                  placeholder="3"
                  defaultValue={mine ? String(mine.baseline_runs) : ''}
                  required
                />
              </label>
              <button type="submit" className="btn-primary">
                {mine ? 'Update my usual week' : 'Save my usual week'}
              </button>
            </form>
            <p className="note">
              Ready: {(baselines ?? []).length} of {people.length}.{' '}
              {(baselines ?? []).length < 2 ? 'Two runners are needed to start.' : ''}
            </p>
            {isOrganiser && (
              <form action={startSeason}>
                <input type="hidden" name="crewId" value={crewId} />
                <button type="submit" className="btn-secondary">
                  Start the season
                </button>
              </form>
            )}
          </div>
        )}

        {season && season.status !== 'setup' && (
          <Link href={`/c/${crewId}`} className="btn-primary">
            Open the feed
          </Link>
        )}
      </section>

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
