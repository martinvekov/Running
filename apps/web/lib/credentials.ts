export const MIN_PASSWORD_LENGTH = 8;
// Passwords are hashed with bcrypt, which ignores anything past 72 bytes.
export const MAX_PASSWORD_LENGTH = 72;

/** A lowercase, trimmed email address, or null if it does not look like one. */
export function cleanEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) ? email : null;
}

/** The password exactly as typed (spaces are allowed), or null if its length is out of range. */
export function cleanPassword(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return input.length >= MIN_PASSWORD_LENGTH && input.length <= MAX_PASSWORD_LENGTH ? input : null;
}
