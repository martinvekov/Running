import { describe, expect, it } from 'vitest';
import { outcomeMessage, outcomeQuery } from './strava-outcome';

describe('outcomeQuery and outcomeMessage', () => {
  it('describes a successful import', () => {
    expect(outcomeQuery([{ status: 'ok', found: 12, imported: 9 }])).toBe(
      'strava=ok&found=12&imported=9',
    );
    expect(outcomeMessage({ strava: 'ok', found: '12', imported: '9' })).toEqual({
      tone: 'ok',
      text: 'Imported 9 new runs (12 found on Strava).',
    });
  });

  it('flags a connection that finds no runs at all', () => {
    const m = outcomeMessage({ strava: 'ok', found: '0', imported: '0' });
    expect(m?.tone).toBe('error');
    expect(m?.text).toContain('no runs');
  });

  it('says nothing is new when everything was already saved', () => {
    expect(outcomeMessage({ strava: 'ok', found: '4', imported: '0' })?.text).toContain(
      'Nothing new',
    );
  });

  it('explains a refused read and a save failure', () => {
    expect(outcomeMessage({ strava: 'no-access', http: '401' })?.text).toContain('Disconnect');
    const q = outcomeQuery([
      { status: 'save-error', message: 'permission denied for table activities' },
    ]);
    expect(q).toContain('strava=save-error');
    expect(outcomeMessage({ strava: 'save-error', detail: 'permission denied' })?.text).toContain(
      'permission denied',
    );
  });

  it('shows nothing when there was no import', () => {
    expect(outcomeMessage({})).toBeNull();
    expect(outcomeQuery([])).toBe('strava=unreachable');
  });
});
