import type { Metadata } from 'next';
import { londonDate, lookBack, type Activity } from '@crew/engine';
import { formatShortDate } from '@/app/_season/format';
import { Label, Monogram, ordinal } from '@/app/_season/ui';
import { NotConnected } from '@/components/not-connected';
import { SubmitButton } from '@/components/submit-button';
import { outcomeMessage } from '@/lib/strava-outcome';
import { LOOK_BACK_BLOCKS, lookBackWindow } from '@/lib/lookback-window';
import { getCrewContext } from '@/lib/season-data';
import { stravaAvailable } from '@/lib/strava-sync';
import { supabaseEnv } from '@/lib/supabase/env';
import { importHistory } from '../actions';

export const metadata: Metadata = { title: 'Pre-season · Crew Seasons' };
export const dynamic = 'force-dynamic';

const PAGE = 1000;

export default async function PreSeasonPage({
  params,
  searchParams,
}: {
  params: Promise<{ crewId: string }>;
  searchParams: Promise<{
    error?: string;
    strava?: string;
    found?: string;
    imported?: string;
    http?: string;
    detail?: string;
  }>;
}) {
  if (!supabaseEnv()) return <NotConnected />;
  const { crewId } = await params;
  const query = await searchParams;
  const message = outcomeMessage(query);
  const { supabase, user, crew } = await getCrewContext(crewId);
  const window = lookBackWindow(londonDate(new Date().toISOString()));

  const { data: members } = await supabase
    .from('crew_members')
    .select('user_id, profiles(display_name)')
    .eq('crew_id', crewId);
  const runners = (members ?? []).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { id: m.user_id as string, name: (p?.display_name as string | undefined) ?? 'Runner' };
  });
  const ids = runners.map((r) => r.id);
  const names = new Map(runners.map((r) => [r.id, r.name]));

  // Row Level Security shows you your own runs and your crew mates'. The API returns at most
  // 1000 rows a request, so read in pages.
  const activities: Activity[] = [];
  for (let from = 0; from < 10 * PAGE; from += PAGE) {
    const { data } = await supabase
      .from('activities')
      .select('id, user_id, source, run_date, duration_s, distance_m, created_at')
      .in('user_id', ids)
      .gte('run_date', window.historyFrom)
      .lte('run_date', window.lastSunday)
      .order('run_date')
      .order('id')
      .range(from, from + PAGE - 1);
    for (const a of data ?? []) {
      activities.push({
        id: a.id as string,
        runnerId: a.user_id as string,
        source: a.source as 'manual' | 'strava',
        runDate: a.run_date as string,
        durationS: a.duration_s as number,
        distanceM: a.distance_m as number,
        loggedAt: a.created_at as string,
      });
    }
    if ((data ?? []).length < PAGE) break;
  }

  const result = lookBack({
    rulesVersion: 'v1',
    runners,
    activities,
    firstStart: window.firstStart,
    blocks: LOOK_BACK_BLOCKS,
  });
  const runCounts = new Map<string, number>();
  for (const a of activities) runCounts.set(a.runnerId, (runCounts.get(a.runnerId) ?? 0) + 1);
  const played = result.blocks.filter((b) => b.result).length;
  const scored = result.totals.filter((t) => t.blocksPlayed > 0).length;
  const winner = result.totals[0];
  const { data: strava } = await supabase
    .from('strava_connections')
    .select('connected_at')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <main className="page with-tabbar">
      <header className="masthead">
        <div className="masthead-top">
          <Label>{crew.name}</Label>
        </div>
        <h1>Pre-season</h1>
        <p className="masthead-meta">
          {formatShortDate(window.firstStart)} – {formatShortDate(window.lastSunday)} · who won the
          last six months
        </p>
      </header>

      {message && (
        <p className={message.tone === 'ok' ? 'note' : 'error-note'} role="status">
          {message.text}
        </p>
      )}

      {winner && played > 0 && winner.points > 0 ? (
        <section className="section">
          <div className="section-head">
            <Label>Over {played} blocks of three weeks</Label>
            <Label className="dim">Points</Label>
          </div>
          {scored >= 2 ? (
            <p className="leadline">
              <strong>{names.get(winner.runnerId)}</strong> won the last six months
            </p>
          ) : (
            <p className="note">
              Only {names.get(winner.runnerId)} has enough runs so far, so this is one runner
              against their own usual week. When friends connect Strava and import theirs, it
              becomes a league.
            </p>
          )}
          <ol className="table">
            {result.totals.map((t) => (
              <li key={t.runnerId} className={t.rank === 1 ? 'leader' : undefined}>
                <div className="row">
                  <span className="row-rank">{t.rank}</span>
                  <Monogram name={names.get(t.runnerId) ?? ''} size={38} />
                  <span className="row-name">
                    {names.get(t.runnerId)}
                    <small>
                      {t.blocksWon} {t.blocksWon === 1 ? 'block' : 'blocks'} won · {t.blocksPlayed}{' '}
                      played · {runCounts.get(t.runnerId) ?? 0} runs
                    </small>
                  </span>
                  <span className="row-num">{t.points}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="section">
          <div className="section-head">
            <Label>Nothing to score yet</Label>
          </div>
          <p className="note">
            No block could be scored. Each runner needs runs on at least two days in the four weeks
            before a block starts. {activities.length}{' '}
            {activities.length === 1 ? 'run is' : 'runs are'} saved for this crew in this period.
            Import your Strava history below.
          </p>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <Label>Your Strava history</Label>
          <Label className="dim">{strava ? 'Connected' : 'Not connected'}</Label>
        </div>
        {!stravaAvailable() ? (
          <p className="note">Strava isn’t switched on for this app yet.</p>
        ) : strava ? (
          <div className="stack">
            <p className="note">
              Brings in your runs from the last seven months. It can take a few seconds.
            </p>
            <form action={importHistory}>
              <input type="hidden" name="crewId" value={crewId} />
              <SubmitButton pending="Importing from Strava… this can take 20 seconds">
                Import last 7 months
              </SubmitButton>
            </form>
          </div>
        ) : (
          <div className="stack">
            <p className="note">Connect Strava first, then import your history.</p>
            <a className="btn-primary" href={`/api/strava/connect?crew=${crewId}&to=preseason`}>
              Connect Strava
            </a>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <Label>Block by block</Label>
          <Label className="dim">Winner</Label>
        </div>
        <ul className="block-list">
          {[...result.blocks].reverse().map((b) => {
            const top = b.result?.standings[0];
            return (
              <li key={b.startDate}>
                <details>
                  <summary>
                    <span>
                      {formatShortDate(b.startDate)} – {formatShortDate(b.endDate)}
                    </span>
                    <strong>
                      {top ? `${names.get(top.runnerId)} · ${top.points}` : 'Not scored'}
                    </strong>
                  </summary>
                  {b.result ? (
                    <ol className="table compact">
                      {b.result.standings.map((row) => (
                        <li key={row.runnerId}>
                          <div className="row">
                            <span className="row-rank">{row.rank}</span>
                            <Monogram name={names.get(row.runnerId) ?? ''} size={30} />
                            <span className="row-name">
                              {names.get(row.runnerId)}
                              <small>
                                {ordinal(row.rank)} · {row.weeksWordKept} of 3 weeks word kept ·{' '}
                                {row.duelWins} duel {row.duelWins === 1 ? 'win' : 'wins'}
                              </small>
                            </span>
                            <span className="row-num">{row.points}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="note">{b.skipped}</p>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
        <p className="caption">
          Each block is scored like a real season. Everyone is held to their own usual week, taken
          from the four weeks before the block. There are no commitments or bounties in the past.
        </p>
      </section>
    </main>
  );
}
