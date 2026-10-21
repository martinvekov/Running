export const MAX_COMMENT_LENGTH = 280;

/** A comment as stored: no control characters, tidy spacing, 1 to 280 characters. */
export function cleanComment(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const text = input
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length >= 1 && text.length <= MAX_COMMENT_LENGTH ? text : null;
}

/** "just now", "5m", "3h", "2d", or a date once it is older than a week. */
export function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/London',
  });
}
