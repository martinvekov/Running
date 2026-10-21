/** Turns a Supabase sign-up or sign-in error code into the key of a message people can act on. */
export function authErrorKey(code: string | undefined): string {
  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
      return 'exists';
    case 'weak_password':
      return 'password';
    case 'invalid_credentials':
      return 'credentials';
    case 'email_address_invalid':
      return 'email';
    case 'over_email_send_rate_limit':
      return 'rate_email';
    case 'over_request_rate_limit':
      return 'rate';
    case 'signup_disabled':
      return 'signups_off';
    case 'email_address_not_authorized':
      return 'email_blocked';
    default:
      return 'failed';
  }
}

/** A short error code that is safe to show on screen and put in a link, or null. */
export function cleanReference(value: string | undefined): string | null {
  return value && /^[a-z0-9_]{1,60}$/i.test(value) ? value : null;
}
