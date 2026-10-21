import { describe, expect, it } from 'vitest';
import { inviteMessage, inviteUrl, isInviteCode, whatsappShareUrl } from './invite';

describe('invite links', () => {
  it('builds the join link from the site origin', () => {
    expect(inviteUrl('https://crew-run-alpha.vercel.app', 'abc123def456')).toBe(
      'https://crew-run-alpha.vercel.app/join/abc123def456',
    );
    expect(inviteUrl('https://crew-run-alpha.vercel.app/', 'abc123def456')).toBe(
      'https://crew-run-alpha.vercel.app/join/abc123def456',
    );
  });

  it('builds a WhatsApp share link with the message encoded', () => {
    const url = whatsappShareUrl(inviteMessage('Sunday Club', 'https://x.test/join/abc'));
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1]!)).toContain('Sunday Club');
    expect(decodeURIComponent(url.split('text=')[1]!)).toContain('https://x.test/join/abc');
  });

  it('accepts the codes the database makes and rejects junk', () => {
    expect(isInviteCode('0123456789abcdef0123456789abcdef')).toBe(true);
    expect(isInviteCode('short')).toBe(false);
    expect(isInviteCode('has space in it 123456')).toBe(false);
    expect(isInviteCode('../../etc/passwd')).toBe(false);
  });
});
