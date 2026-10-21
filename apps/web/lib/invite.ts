/** The link a friend opens to join a crew. */
export function inviteUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/join/${code}`;
}

export function inviteMessage(crewName: string, url: string): string {
  return `Join ${crewName} on Crew Seasons. Three weeks, one crew, anyone can win.\n${url}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Codes are 32 hex characters from the database; accept any plain token of a sensible length. */
export function isInviteCode(code: string): boolean {
  return /^[a-z0-9-]{8,64}$/i.test(code);
}
