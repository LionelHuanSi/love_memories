import { describe, it, expect } from 'vitest';

interface InviteState {
  id: string;
  space_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  revoked_at: Date | null;
}

interface SpaceMemberState {
  space_id: string;
  user_id: string;
  role: 'owner' | 'partner';
}

function simulateAcceptInvite(
  invite: InviteState,
  currentMembers: SpaceMemberState[],
  joiningUserId: string
) {
  if (invite.used_at !== null) {
    return { success: false, error: 'Invitation has already been used' };
  }
  if (invite.revoked_at !== null) {
    return { success: false, error: 'Invitation has been revoked' };
  }
  if (invite.expires_at.getTime() < Date.now()) {
    return { success: false, error: 'Invitation has expired' };
  }
  if (currentMembers.length >= 2) {
    return { success: false, error: 'This space already has two members' };
  }
  if (currentMembers.some((m) => m.user_id === joiningUserId)) {
    return { success: false, error: 'You are already a member of this space' };
  }

  // Successfully join
  const updatedMembers = [
    ...currentMembers,
    { space_id: invite.space_id, user_id: joiningUserId, role: 'partner' as const },
  ];
  const updatedInvite = { ...invite, used_at: new Date() };

  return { success: true, updatedMembers, updatedInvite };
}

describe('Milestone A: Partner Invite Acceptance & 2-Member Limit Logic', () => {
  const spaceId = 'space-uuid-001';
  const ownerUserId = 'owner-uuid-001';
  const partnerUserId = 'partner-uuid-002';
  const thirdUserId = 'intruder-uuid-003';

  const validInvite: InviteState = {
    id: 'invite-uuid-1',
    space_id: spaceId,
    token_hash: 'valid-hash-1234',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
    used_at: null,
    revoked_at: null,
  };

  const initialMembers: SpaceMemberState[] = [
    { space_id: spaceId, user_id: ownerUserId, role: 'owner' },
  ];

  it('allows a partner to join when invite is valid and space has 1 member', () => {
    const result = simulateAcceptInvite(validInvite, initialMembers, partnerUserId);

    expect(result.success).toBe(true);
    expect(result.updatedMembers).toHaveLength(2);
    expect(result.updatedMembers?.some((m) => m.user_id === partnerUserId && m.role === 'partner')).toBe(true);
    expect(result.updatedInvite?.used_at).not.toBeNull();
  });

  it('rejects an invitation that has already been used', () => {
    const usedInvite: InviteState = {
      ...validInvite,
      used_at: new Date(Date.now() - 3600000),
    };

    const result = simulateAcceptInvite(usedInvite, initialMembers, partnerUserId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invitation has already been used');
  });

  it('rejects an expired invitation', () => {
    const expiredInvite: InviteState = {
      ...validInvite,
      expires_at: new Date(Date.now() - 10000), // 10 seconds ago
    };

    const result = simulateAcceptInvite(expiredInvite, initialMembers, partnerUserId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invitation has expired');
  });

  it('rejects an invitation that has been revoked', () => {
    const revokedInvite: InviteState = {
      ...validInvite,
      revoked_at: new Date(Date.now() - 5000),
    };

    const result = simulateAcceptInvite(revokedInvite, initialMembers, partnerUserId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invitation has been revoked');
  });

  it('strictly blocks a third member from being added when space is full (2 members)', () => {
    const twoMembers: SpaceMemberState[] = [
      { space_id: spaceId, user_id: ownerUserId, role: 'owner' },
      { space_id: spaceId, user_id: partnerUserId, role: 'partner' },
    ];

    const result = simulateAcceptInvite(validInvite, twoMembers, thirdUserId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('This space already has two members');
  });

  it('prevents an existing member from re-accepting', () => {
    const result = simulateAcceptInvite(validInvite, initialMembers, ownerUserId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('You are already a member of this space');
  });
});
