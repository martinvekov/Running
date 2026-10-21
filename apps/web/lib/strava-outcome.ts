import type { ImportOutcome } from './strava-sync';

/** The query string a page uses to tell the person what an import did. */
export function outcomeQuery(outcomes: ImportOutcome[]): string {
  const o = outcomes[0];
  if (!o) return 'strava=unreachable';
  switch (o.status) {
    case 'ok':
      return `strava=ok&found=${o.found}&imported=${o.imported}`;
    case 'save-error':
      return `strava=save-error&detail=${encodeURIComponent(o.message.slice(0, 140))}`;
    case 'no-access':
    case 'strava-error':
      return `strava=${o.status}&http=${o.httpStatus}`;
    default:
      return `strava=${o.status}`;
  }
}

/** Plain words for each outcome. */
export function outcomeMessage(params: {
  strava?: string | undefined;
  found?: string | undefined;
  imported?: string | undefined;
  http?: string | undefined;
  detail?: string | undefined;
}): { tone: 'ok' | 'error'; text: string } | null {
  switch (params.strava) {
    case undefined:
      return null;
    case 'ok': {
      const found = Number(params.found ?? 0);
      const imported = Number(params.imported ?? 0);
      if (found === 0) {
        return {
          tone: 'error',
          text: 'Strava connected, but it returned no runs for this period. Check the runs are on Strava and not set to “Only you”.',
        };
      }
      return {
        tone: 'ok',
        text:
          imported > 0
            ? `Imported ${imported} new ${imported === 1 ? 'run' : 'runs'} (${found} found on Strava).`
            : `Nothing new. All ${found} runs found on Strava were already saved.`,
      };
    }
    case 'no-access':
      return {
        tone: 'error',
        text: `Strava wouldn’t let us read your runs (error ${params.http ?? '401'}). Disconnect, connect again, and keep “View data about your activities” ticked.`,
      };
    case 'strava-error':
      return {
        tone: 'error',
        text: `Strava had a problem (error ${params.http}). Try again in a minute.`,
      };
    case 'save-error':
      return {
        tone: 'error',
        text: `Strava runs were found but couldn’t be saved: ${params.detail ?? 'unknown error'}`,
      };
    case 'not-connected':
      return {
        tone: 'error',
        text: 'Strava isn’t connected for your account. Tap Connect Strava first.',
      };
    default:
      return { tone: 'error', text: 'Couldn’t reach Strava. Try again in a minute.' };
  }
}
