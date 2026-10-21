export const MAX_NAME_LENGTH = 40;
export const MAX_CREW_NAME_LENGTH = 60;

/** A display name as stored: no control characters, single spaces, 1 to 40 characters. */
export function cleanDisplayName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name.length >= 1 && name.length <= MAX_NAME_LENGTH ? name : null;
}

interface ProfileMeta {
  full_name?: string;
  name?: string;
  display_name?: string;
}

/** The name we prefill on the welcome screen: the first name Google gives us. */
export function suggestDisplayName(meta: ProfileMeta, email?: string): string {
  const given = meta.display_name ?? meta.full_name ?? meta.name ?? '';
  const first = cleanDisplayName(given.trim().split(/\s+/)[0] ?? '');
  if (first) return first;
  const local = cleanDisplayName((email ?? '').split('@')[0] ?? '');
  return local ?? 'Runner';
}

/** A crew name as stored: same cleaning as a display name, up to 60 characters. */
export function cleanCrewName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name.length >= 1 && name.length <= MAX_CREW_NAME_LENGTH ? name : null;
}
