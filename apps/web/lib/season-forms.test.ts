import { describe, expect, it } from 'vitest';
import {
  parseBaseline,
  parseBounties,
  parseDuration,
  parseRun,
  parseStartDate,
  upcomingMondays,
} from './season-forms';

describe('upcomingMondays', () => {
  it('starts on the Monday after today', () => {
    expect(upcomingMondays('2026-10-21', 3)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
  });
  it('skips today when today is a Monday', () => {
    expect(upcomingMondays('2026-10-26', 2)).toEqual(['2026-11-02', '2026-11-09']);
  });
  it('works from a Sunday', () => {
    expect(upcomingMondays('2026-10-25', 1)).toEqual(['2026-10-26']);
  });
});

describe('parseStartDate', () => {
  it('accepts only real Mondays', () => {
    expect(parseStartDate('2026-11-02')).toBe('2026-11-02');
    expect(parseStartDate('2026-11-03')).toBeNull();
    expect(parseStartDate('2026-02-30')).toBeNull();
    expect(parseStartDate(undefined)).toBeNull();
  });
});

describe('parseBounties', () => {
  it('trims, keeps blanks as null and rejects long titles', () => {
    expect(parseBounties(['  A run  before 7am ', '', undefined])).toEqual([
      'A run before 7am',
      null,
      null,
    ]);
    expect(parseBounties(['x'.repeat(81)])).toBeNull();
  });
});

describe('parseBaseline', () => {
  it('reads km and runs', () => {
    expect(parseBaseline('32,5', '4')).toEqual({ km: 32.5, runs: 4 });
  });
  it('rejects nonsense', () => {
    expect(parseBaseline('0', '3')).toBeNull();
    expect(parseBaseline('20', '0')).toBeNull();
    expect(parseBaseline('20', '2.5')).toBeNull();
    expect(parseBaseline('abc', '3')).toBeNull();
    expect(parseBaseline('501', '3')).toBeNull();
  });
});

describe('parseDuration', () => {
  it('reads minutes, mm:ss and h:mm:ss', () => {
    expect(parseDuration('42')).toBe(2520);
    expect(parseDuration('42:30')).toBe(2550);
    expect(parseDuration('1:05:10')).toBe(3910);
    expect(parseDuration('25.5')).toBe(1530);
  });
  it('rejects bad input', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('12:75')).toBeNull();
    expect(parseDuration('0')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('25:00:00:00')).toBeNull();
  });
});

describe('parseRun', () => {
  const window = { today: '2026-11-05', start: '2026-11-02', end: '2026-11-22' };
  const good = { date: '2026-11-04', km: '8.2', time: '45:10', link: '', bounty: 'on' };

  it('turns a good form into a run', () => {
    expect(parseRun(good, window)).toEqual({
      ok: true,
      run: { runDate: '2026-11-04', distanceM: 8200, durationS: 2710, linkUrl: null, bounty: true },
    });
  });
  it('explains what is wrong', () => {
    expect(parseRun({ ...good, date: '2026-11-06' }, window)).toEqual({
      ok: false,
      error: 'future',
    });
    expect(parseRun({ ...good, date: '2026-10-30' }, window)).toEqual({
      ok: false,
      error: 'outside',
    });
    expect(parseRun({ ...good, km: '0' }, window)).toEqual({ ok: false, error: 'distance' });
    expect(parseRun({ ...good, time: 'x' }, window)).toEqual({ ok: false, error: 'time' });
    expect(parseRun({ ...good, link: 'javascript:alert(1)' }, window)).toEqual({
      ok: false,
      error: 'link',
    });
  });
  it('keeps a link and leaves the bounty off when unticked', () => {
    const r = parseRun(
      { ...good, link: 'https://www.strava.com/activities/1', bounty: null },
      window,
    );
    expect(r).toMatchObject({
      ok: true,
      run: { linkUrl: 'https://www.strava.com/activities/1', bounty: false },
    });
  });
});
