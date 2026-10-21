import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { addDays, commitmentBands, londonDate, rulesV1 } from '@crew/engine';
import { formatDay, formatDuration, formatKm, formatShortDate } from '@/app/_season/format';
import { Label } from '@/app/_season/ui';
import { NotConnected } from '@/components/not-connected';
import { SubmitButton } from '@/components/submit-button';
import { outcomeMessage } from '@/lib/strava-outcome';
import { getCrewContext, getSeasonView } from '@/lib/season-data';
import { supabaseEnv } from '@/lib/supabase/env';
import { stravaAvailable } from '@/lib/strava-sync';
import { deleteRun, disconnectStrava, logRun, setCommitment, syncStravaNow } from '../actions';

export const metadata: Metadata = { title: 'Log a run · Crew Seasons' };
export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  date: 'Pick the date of the run.',
  future: 'That date is in the future.',
  outside: 'That date is outside the three season weeks.',
  distance: 'Enter the distance in km, like 8.2.',
  time: 'Enter the time like 45 or 45:30.',
  link: 'The link should start with http:// or https://.',
  inactive: 'The season isn’t running right now.',
  'not-member': 'You joined after the season was set up, so you’re watching this one.',
  deadline: 'That week’s deadline has passed.',
  commit: 'That’s outside the range for your usual week. Check the numbers below.',
  strava: 'Couldn’t connect to Strava. Please try again.',
  'strava-denied': 'Strava wasn’t connected. Tap Connect Strava and choose Authorize.',
  save: 'Something went wrong saving that. Please try again.',
};

const SAVED: Record<string, string> = {
  run: 'Run logged.',
  deleted: 'Run deleted.',
  commitment: 'Commitment saved.',
  strava: 'Strava connected. Your runs are on their way in.',
  'strava-sync': 'Checked Strava for new runs.',
  'strava-off': 'Strava disconnected. Runs already imported stay.',
};

export default async function LogPage({
  params,
  searchParams,
}: {
  params: Promise<{ crewId: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    week?: string;
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
  const { error, saved } = query;
  const stravaMessage = outcomeMessage(query);
  const { supabase, user, season: seasonRow } = await getCrewContext(crewId);
  if (!seasonRow || seasonRow.status === 'setup') redirect(`/c/${crewId}/crew`);
  // The season view, your Strava status and your runs are all asked for at once.
  const seasonEnd = addDays(seasonRow.start_date, 20);
  const [view, { data: strava }, { data: mine }] = await Promise.all([
    getSeasonView(crewId),
    supabase
      .from('strava_connections')
      .select('connected_at, last_synced_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('activities')
      .select('id, run_date, distance_m, duration_s, source')
      .eq('user_id', user.id)
      .gte('run_date', seasonRow.start_date)
      .lte('run_date', seasonEnd)
      .order('run_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (!view) redirect(`/c/${crewId}/crew`);

  const today = londonDate(new Date().toISOString());
  const me = view.runnersById.get(user.id);
  const bands = me ? commitmentBands(rulesV1, me) : null;
  const weeks = view.result.weeks;
  const openWeeks = weeks.filter((w) => Date.parse(w.commitDeadline) > Date.now());
  const season = view.input.season;
  const first = weeks[0]!.startDate;
  const last = weeks.at(-1)!.endDate;
  const bounties = view.input.bounties;

  const syncedMinutes = strava?.last_synced_at
    ? Math.max(0, Math.round((Date.now() - Date.parse(strava.last_synced_at as string)) / 60_000))
    : null;

  return (
    <main className="page with-tabbar">
      <header className="masthead">
        <div className="masthead-top">
          <Label>{view.crewName}</Label>
        </div>
        <h1>Log a run</h1>
        <p className="masthead-meta">
          Season {view.seasonNumber} · {formatShortDate(first)} – {formatShortDate(last)}
        </p>
      </header>

      {error && <p className="error-note">{MESSAGES[error] ?? MESSAGES.save}</p>}
      {saved && <p className="note">{SAVED[saved] ?? 'Saved.'}</p>}
      {stravaMessage && (
        <p className={stravaMessage.tone === 'ok' ? 'note' : 'error-note'} role="status">
          {stravaMessage.text}
        </p>
      )}

      {me && stravaAvailable() && (
        <section className="section">
          <div className="section-head">
            <Label>Strava</Label>
            <Label className="dim">{strava ? 'Connected' : 'Automatic runs'}</Label>
          </div>
          {strava ? (
            <div className="stack">
              <p className="note">
                Your Strava runs arrive on their own.{' '}
                {syncedMinutes === null
                  ? 'Waiting for the first sync.'
                  : syncedMinutes < 1
                    ? 'Checked just now.'
                    : `Last checked ${syncedMinutes} min ago.`}
              </p>
              <div className="button-row">
                <form action={syncStravaNow}>
                  <input type="hidden" name="crewId" value={crewId} />
                  <SubmitButton pending="Checking Strava…" className="btn-secondary">
                    Check for new runs
                  </SubmitButton>
                </form>
                <form action={disconnectStrava}>
                  <input type="hidden" name="crewId" value={crewId} />
                  <SubmitButton className="link-quiet" pending="Disconnecting…">
                    Disconnect
                  </SubmitButton>
                </form>
              </div>
            </div>
          ) : (
            <div className="stack">
              <p className="note">
                Connect once and every run you record on Strava is added for you. We read the date,
                distance and time, and nothing else.
              </p>
              <a className="btn-primary" href={`/api/strava/connect?crew=${crewId}`}>
                Connect Strava
              </a>
            </div>
          )}
        </section>
      )}

      {me ? (
        <section className="section">
          <div className="section-head">
            <Label>New run</Label>
            <Label className="dim">By hand</Label>
          </div>
          <form action={logRun} className="stack">
            <input type="hidden" name="crewId" value={crewId} />
            <label className="field">
              <span>Distance (km)</span>
              <input name="km" inputMode="decimal" placeholder="8.2" required />
            </label>
            <label className="field">
              <span>Time (minutes, or 45:30)</span>
              <input name="time" inputMode="text" placeholder="45:00" required />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                name="date"
                type="date"
                defaultValue={today}
                min={season.startDate}
                max={today}
                required
              />
            </label>
            <label className="field">
              <span>Link to the run (optional)</span>
              <input name="link" type="url" inputMode="url" placeholder="https://" />
            </label>
            {bounties.length > 0 && (
              <label className="check">
                <input type="checkbox" name="bounty" />
                <span>
                  This run claims the week&apos;s bounty
                  <small>
                    {bounties.map((b) => `Week ${b.weekIndex + 1}: ${b.title}`).join(' · ')}
                  </small>
                </span>
              </label>
            )}
            <SubmitButton className="btn-primary" pending="Logging…">
              Log run
            </SubmitButton>
          </form>
          <p className="caption">
            Log a run within two days of running it, or it won’t count. Only one run a day earns
            show-up points.
          </p>
        </section>
      ) : (
        <p className="note">{MESSAGES['not-member']}</p>
      )}

      {me && bands && (
        <section className="section">
          <div className="section-head">
            <Label>Your commitment</Label>
            <Label className="dim">Due Sunday 23:59</Label>
          </div>
          <p className="note">
            Your usual week is {formatKm(me.baselineKm)} and {me.baselineRuns} runs. Promise between{' '}
            {formatKm(bands.minKm)} and {formatKm(bands.maxKm)}, and {bands.minRuns} to{' '}
            {bands.maxRuns} runs. Miss the deadline and last week&apos;s plan carries over.
          </p>
          {openWeeks.length === 0 && <p className="note">No weeks are open for commitments.</p>}
          {openWeeks.map((w) => {
            const mineNow = w.runners.find((r) => r.runnerId === user.id)?.commitment;
            return (
              <form key={w.weekIndex} action={setCommitment} className="stack commit-form">
                <input type="hidden" name="crewId" value={crewId} />
                <input type="hidden" name="week" value={w.weekIndex} />
                <div className="spread">
                  <strong>Week {w.weekIndex + 1}</strong>
                  <span className="small muted">
                    {mineNow
                      ? `${mineNow.runs} runs · ${formatKm(mineNow.km)}${
                          mineNow.source === 'set' ? '' : ` (${mineNow.source.replace('-', ' ')})`
                        }`
                      : ''}
                  </span>
                </div>
                <div className="two">
                  <label className="field">
                    <span>Runs</span>
                    <input
                      name="runs"
                      inputMode="numeric"
                      defaultValue={mineNow?.runs ?? me.baselineRuns}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Km</span>
                    <input
                      name="km"
                      inputMode="decimal"
                      defaultValue={mineNow?.km ?? me.baselineKm}
                      required
                    />
                  </label>
                </div>
                <SubmitButton className="btn-secondary" pending="Saving…">
                  Commit for week {w.weekIndex + 1}
                </SubmitButton>
              </form>
            );
          })}
        </section>
      )}

      {(mine ?? []).length > 0 && (
        <section className="section">
          <div className="section-head">
            <Label>Your runs</Label>
          </div>
          <ul className="run-list">
            {(mine ?? []).map((run) => (
              <li key={run.id as string} className="run-row">
                <Label className="dim run-day">{formatDay(run.run_date as string)}</Label>
                <span className="run-km">{((run.distance_m as number) / 1000).toFixed(2)}</span>
                <Label className="dim">{formatDuration(run.duration_s as number)}</Label>
                {run.source === 'manual' ? (
                  <form action={deleteRun}>
                    <input type="hidden" name="crewId" value={crewId} />
                    <input type="hidden" name="id" value={run.id as string} />
                    <SubmitButton className="link-quiet" pending="Deleting…">
                      Delete
                    </SubmitButton>
                  </form>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
