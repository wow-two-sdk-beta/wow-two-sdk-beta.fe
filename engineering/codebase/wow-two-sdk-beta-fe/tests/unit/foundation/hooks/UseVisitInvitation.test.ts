import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { isVisitInvitationDue, useVisitInvitation, type VisitInvitationRecord } from '@src/foundation/hooks';

const policy = {
  maxInvitations: 2,
  retryDelayMs: 12 * 60 * 60 * 1000,
  completedRetryDelayMs: 7 * 24 * 60 * 60 * 1000,
};
const now = Date.parse('2026-09-25T12:00:00Z');

describe('visit invitations', () => {
  it('respects skip, completion, maximum and permanent-dismissal policy', () => {
    expect(isVisitInvitationDue({ invitations: 0, hiddenPermanently: false }, policy, now)).toBe(true);
    expect(
      isVisitInvitationDue(
        { invitations: 1, lastInvitationAt: '2026-09-25T01:00:01Z', hiddenPermanently: false },
        policy,
        now,
      ),
    ).toBe(false);
    expect(
      isVisitInvitationDue(
        { invitations: 1, lastInvitationAt: '2026-09-25T00:00:00Z', hiddenPermanently: false },
        policy,
        now,
      ),
    ).toBe(true);
    expect(
      isVisitInvitationDue(
        {
          invitations: 1,
          lastInvitationAt: '2026-09-19T12:00:01Z',
          completedAt: '2026-09-19T12:05:00Z',
          hiddenPermanently: false,
        },
        policy,
        now,
      ),
    ).toBe(false);
    expect(isVisitInvitationDue({ invitations: 2, hiddenPermanently: false }, policy, now)).toBe(false);
    expect(isVisitInvitationDue({ invitations: 0, hiddenPermanently: true }, policy, now)).toBe(false);
  });

  it('reads current reactive records for getters and mutations', () => {
    const record = ref<VisitInvitationRecord>({ invitations: 0, hiddenPermanently: false });
    const invitation = useVisitInvitation({
      record,
      policy,
      onChange: (next) => {
        record.value = next;
      },
    });
    expect(invitation.isDue).toBe(true);
    expect(invitation.recordInvitation(new Date('2026-09-25T12:00:00Z'))).toEqual({
      invitations: 1,
      lastInvitationAt: '2026-09-25T12:00:00.000Z',
      hiddenPermanently: false,
    });
    invitation.markCompleted(new Date('2026-09-25T12:05:00Z'));
    expect(record.value.completedAt).toBe('2026-09-25T12:05:00.000Z');
    record.value = { invitations: 2, hiddenPermanently: true };
    expect(invitation.isDue).toBe(false);
  });
});
