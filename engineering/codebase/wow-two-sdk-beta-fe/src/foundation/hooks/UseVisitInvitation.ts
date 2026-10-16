import { computed, toValue, type MaybeRefOrGetter } from 'vue';

export interface VisitInvitationRecord {
  invitations: number;
  lastInvitationAt?: string;
  completedAt?: string;
  hiddenPermanently: boolean;
}

export interface VisitInvitationPolicy {
  maxInvitations: number;
  retryDelayMs: number;
  completedRetryDelayMs: number;
}

export interface UseVisitInvitationOptions {
  record: MaybeRefOrGetter<VisitInvitationRecord>;
  policy: MaybeRefOrGetter<VisitInvitationPolicy>;
  onChange(record: VisitInvitationRecord): void;
}

export function isVisitInvitationDue(
  record: VisitInvitationRecord,
  policy: VisitInvitationPolicy,
  now = Date.now(),
): boolean {
  if (record.hiddenPermanently || record.invitations >= policy.maxInvitations) return false;
  if (record.invitations === 0) return true;
  const previous = record.lastInvitationAt ? Date.parse(record.lastInvitationAt) : Number.NaN;
  if (!Number.isFinite(previous)) return false;
  return now - previous >= (record.completedAt ? policy.completedRetryDelayMs : policy.retryDelayMs);
}

/** Applies a bounded invitation policy to reactive caller-owned visit state. */
export function useVisitInvitation(options: UseVisitInvitationOptions) {
  const due = computed(() => isVisitInvitationDue(toValue(options.record), toValue(options.policy)));

  const recordInvitation = (now = new Date()): VisitInvitationRecord => {
    const record = toValue(options.record);
    const policy = toValue(options.policy);
    const invitations = Math.min(policy.maxInvitations, record.invitations + 1);
    const next = {
      ...record,
      invitations,
      lastInvitationAt: now.toISOString(),
      hiddenPermanently: invitations >= policy.maxInvitations,
    };
    options.onChange(next);
    return next;
  };

  const markCompleted = (now = new Date()): VisitInvitationRecord => {
    const next = { ...toValue(options.record), completedAt: now.toISOString() };
    options.onChange(next);
    return next;
  };

  return {
    get isDue() {
      return due.value;
    },
    recordInvitation,
    markCompleted,
  };
}
