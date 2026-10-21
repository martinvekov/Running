import { describe, expect, it } from 'vitest';
import { authErrorKey, cleanReference } from './auth-errors';

describe('authErrorKey', () => {
  it('maps the codes people can act on', () => {
    expect(authErrorKey('user_already_exists')).toBe('exists');
    expect(authErrorKey('email_exists')).toBe('exists');
    expect(authErrorKey('weak_password')).toBe('password');
    expect(authErrorKey('invalid_credentials')).toBe('credentials');
    expect(authErrorKey('email_address_invalid')).toBe('email');
    expect(authErrorKey('over_email_send_rate_limit')).toBe('rate_email');
    expect(authErrorKey('over_request_rate_limit')).toBe('rate');
    expect(authErrorKey('signup_disabled')).toBe('signups_off');
    expect(authErrorKey('email_address_not_authorized')).toBe('email_blocked');
  });

  it('falls back to a generic failure for anything else', () => {
    expect(authErrorKey('unexpected_failure')).toBe('failed');
    expect(authErrorKey(undefined)).toBe('failed');
    expect(authErrorKey('')).toBe('failed');
  });
});

describe('cleanReference', () => {
  it('keeps a short code and drops anything that could carry markup or secrets', () => {
    expect(cleanReference('over_email_send_rate_limit')).toBe('over_email_send_rate_limit');
    expect(cleanReference('500')).toBe('500');
    expect(cleanReference('<script>alert(1)</script>')).toBeNull();
    expect(cleanReference('a'.repeat(61))).toBeNull();
    expect(cleanReference(undefined)).toBeNull();
    expect(cleanReference('')).toBeNull();
  });
});
