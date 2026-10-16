<script lang="ts">
import type { ReportReceipt, ReportSend } from '../../../reporting';

/** Defines where a one-click report stands. */
export const ReportState = {
  /** Refers to a report not yet sent. */
  Idle: 'idle',
  /** Refers to a report on its way. */
  Sending: 'sending',
  /** Refers to a delivered report — its reference shows. */
  Sent: 'sent',
  /** Refers to a failed delivery — the action offers a retry. */
  Failed: 'failed',
} as const;

export type ReportState = (typeof ReportState)[keyof typeof ReportState];

export interface ReportActionProps {
  /** Sends the report — a captured incident's `send`. A different function resets the action to idle. */
  readonly send: ReportSend;
  /** The label before sending. Default `"Report"`. */
  readonly label?: string;
  /** The label while sending. Default `"Sending…"`. */
  readonly sendingLabel?: string;
  /** The label once delivered. Default `"Reported"`. */
  readonly sentLabel?: string;
  /** The label after a failed delivery. Default `"Retry"`. */
  readonly retryLabel?: string;
  /** The status after a failed delivery. Default `"Couldn't send"`. */
  readonly failedText?: string;
  /** The word before the delivered report's reference. Default `"Ref"`. */
  readonly referenceLabel?: string;
  /** The announcement preceding the reference for assistive technology. Default `"Report sent."`. */
  readonly sentAnnouncement?: string;
}

/** A GUID receipt id — shortened to its random tail, since a UUID v7's head is its timestamp. */
const GuidId = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

/** Shortens a receipt id for display — a GUID's last eight hex digits, upper-cased; any other id as given. */
export function toReference(id: string): string {
  return GuidId.test(id) ? id.slice(-8).toUpperCase() : id;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { CircleCheck, Flag, RotateCcw } from 'lucide-vue-next';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { Button } from '../../actions/button';

/**
 * Renders the one-click Report action a failure notice carries — Report → Sending… → Reported with the
 * receipt's reference, or a Retry when delivery fails. A second click never sends twice.
 *
 * Clicking focuses the button explicitly (Safari does not on its own), so a hosting toast pauses its expiry
 * while the report is in flight; the button stays focusable once sent, keeping that pause until the user
 * moves on. The status region announces the outcome, and the whole action is `data-report-ignore`, so the
 * click that files a report never lands on a trail.
 */
defineOptions({ name: 'ReportAction' });

const componentProps = defineProps<ReportActionProps>();
const props = useLocaleDefaults(componentProps, 'ReportAction', {
  label: 'Report',
  sendingLabel: 'Sending…',
  sentLabel: 'Reported',
  retryLabel: 'Retry',
  failedText: "Couldn't send",
  referenceLabel: 'Ref',
  sentAnnouncement: 'Report sent.',
});

const emit = defineEmits<{
  /** Fires when the report is delivered. */
  sent: [receipt: ReportReceipt];
  /** Fires when delivery fails. */
  failed: [error: unknown];
}>();

const state = shallowRef<ReportState>(ReportState.Idle);
const receipt = shallowRef<ReportReceipt | null>(null);

/* Bumped per send and per reset, so a late settle from a replaced `send` never lands on the new one. */
let run = 0;

watch(
  () => componentProps.send,
  () => {
    run += 1;
    state.value = ReportState.Idle;
    receipt.value = null;
  },
);

const buttonLabel = computed(() => {
  if (state.value === ReportState.Sent) return props.sentLabel;
  if (state.value === ReportState.Failed) return props.retryLabel;
  return props.label;
});

const buttonIcon = computed(() => {
  if (state.value === ReportState.Sent) return CircleCheck;
  if (state.value === ReportState.Failed) return RotateCcw;
  return Flag;
});

async function onClick(event: MouseEvent): Promise<void> {
  (event.currentTarget as HTMLElement | null)?.focus();
  if (state.value === ReportState.Sending || state.value === ReportState.Sent) return;
  run += 1;
  const current = run;
  state.value = ReportState.Sending;
  try {
    const delivered = await componentProps.send();
    if (current !== run) return;
    receipt.value = delivered;
    state.value = ReportState.Sent;
    emit('sent', delivered);
  } catch (error) {
    if (current !== run) return;
    state.value = ReportState.Failed;
    emit('failed', error);
  }
}
</script>

<template>
  <span class="inline-flex items-center gap-2" data-report-ignore :data-state="state">
    <Button
      variant="outline"
      size="xs"
      :is-loading="state === ReportState.Sending"
      :loading-text="props.sendingLabel"
      :aria-disabled="state === ReportState.Sent ? 'true' : undefined"
      @click="onClick"
    >
      <template #leading><Icon :icon="buttonIcon" :size="12" /></template>
      {{ buttonLabel }}
    </Button>
    <span role="status" class="text-xs text-muted-foreground">
      <template v-if="state === ReportState.Sent && receipt">
        <span class="sr-only">{{ props.sentAnnouncement }}</span>
        {{ props.referenceLabel }} <span class="font-mono">{{ toReference(receipt.id) }}</span>
      </template>
      <template v-else-if="state === ReportState.Failed">{{ props.failedText }}</template>
    </span>
  </span>
</template>
