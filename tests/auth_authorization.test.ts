import { describe, it, expect } from 'vitest';
import { generateInviteToken, hashInviteToken } from '@/lib/validations/invite';

describe('Milestone A: Authorization & Invite Token Security', () => {
  it('generates high-entropy crypto random tokens', () => {
    const token1 = generateInviteToken();
    const token2 = generateInviteToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes hex
  });

  it('correctly creates a SHA-256 hash of the invite token', () => {
    const token = 'test-secret-token-1234567890';
    const hash1 = hashInviteToken(token);
    const hash2 = hashInviteToken(token);

    // Hash must be deterministic and 64 hex characters
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);

    // Different tokens yield different hashes
    const differentHash = hashInviteToken('different-token');
    expect(hash1).not.toBe(differentHash);
  });

  it('never stores plaintext token in hash representation', () => {
    const rawToken = generateInviteToken();
    const tokenHash = hashInviteToken(rawToken);

    expect(tokenHash).not.toContain(rawToken);
    expect(rawToken).not.toBe(tokenHash);
  });
});
