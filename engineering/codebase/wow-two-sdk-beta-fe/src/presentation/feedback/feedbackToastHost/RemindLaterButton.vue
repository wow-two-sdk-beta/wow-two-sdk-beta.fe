<script lang="ts">
/** Defines props for the Remind later button of a bus notice. */
export interface RemindLaterButtonProps {
  /** Schedules the reminder. A rejection shows the retry hint and keeps the button available. */
  readonly schedule: () => Promise<void>;
}
</script>

<script setup lang="ts">
import { shallowRef } from 'vue';

import { useLocale } from '../../../foundation/i18n';
import { Button } from '../../actions/button';

/** Renders the Remind later button of a bus notice: loading while the scheduler runs, a status line on failure. */
defineOptions({ name: 'RemindLaterButton' });

const props = defineProps<RemindLaterButtonProps>();

const locale = useLocale();
const pending = shallowRef(false);
const failed = shallowRef(false);

/** Runs the scheduler, holding the button while it runs and flagging a rejection. */
async function remind(event: MouseEvent): Promise<void> {
  (event.currentTarget as HTMLElement | null)?.focus();
  if (pending.value) return;
  pending.value = true;
  failed.value = false;
  try {
    await props.schedule();
  } catch {
    failed.value = true;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <Button
      size="xs"
      variant="outline"
      :is-loading="pending"
      :loading-text="locale.t('FeedbackToastHost.schedulingReminder', undefined, 'Scheduling…')"
      @click="remind"
    >
      {{ locale.t('FeedbackToastHost.remindLater', undefined, 'Remind later') }}
    </Button>
    <span v-if="failed" role="status" class="text-xs text-destructive-soft-foreground">
      {{ locale.t('FeedbackToastHost.reminderFailed', undefined, 'Could not schedule the reminder. Try again.') }}
    </span>
  </div>
</template>
