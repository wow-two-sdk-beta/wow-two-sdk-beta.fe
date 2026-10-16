<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type { ColorTone } from '../../../foundation/styles';

/** Defines props for the inline confirmation popover. */
export interface ConfirmPopoverProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The question the popover asks — it names the panel. */
  readonly title: string;

  /** The consequence spelled out under the title. The `#description` slot is the rich override. */
  readonly description?: string;

  /** The confirm button text. Default `"Confirm"`, localized. */
  readonly confirmLabel?: string;

  /** The cancel button text. Default `"Cancel"`, localized. */
  readonly cancelLabel?: string;

  /** The confirm button tone. Default `primary`; `danger` marks a destructive action. */
  readonly tone?: ColorTone;

  /** The Floating UI placement. Default `top`. */
  readonly placement?: Placement;

  /** The distance between the trigger and the panel in px. Default 8. */
  readonly offset?: number;

  /** The disabled state — the trigger does not open the popover. */
  readonly isDisabled?: boolean;

  /**
   * Runs when the reader confirms. Returning a promise keeps the popover open with a busy confirm button
   * until it settles: it closes on resolve and stays open on reject, emitting `error`.
   *
   * Kept a PROP, not an emit: the popover awaits what it RETURNS, which an emit cannot carry. `@confirm`
   * binds it all the same.
   */
  readonly onConfirm?: () => unknown;
}

/** @internal Whether a value can be awaited. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useAttrs, useSlots } from 'vue';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useControlled } from '../../../foundation/state';
import Button from '../../actions/button/Button.vue';
import Popover from '../popover/Popover.vue';
import PopoverContent from '../popover/PopoverContent.vue';
import PopoverTrigger from '../popover/PopoverTrigger.vue';

/**
 * Renders its trigger and, once pressed, an anchored panel that asks the reader to confirm or cancel one
 * action — a lighter, non-modal sibling of `AlertModal` for actions whose context is the trigger itself.
 */
defineOptions({ name: 'ConfirmPopover', inheritAttrs: false });

defineSlots<{
  /** The trigger — one element, merged through `as-child`. */
  default(): unknown;

  /** The rich override for the `description` prop. */
  description?(): unknown;
}>();

const componentProps = withDefaults(defineProps<ConfirmPopoverProps>(), {
  open: undefined,
  defaultOpen: false,
  description: undefined,
  tone: 'primary',
  placement: 'top',
  offset: 8,
  isDisabled: false,
  onConfirm: undefined,
});
const props = useLocaleDefaults(componentProps, 'ConfirmPopover', { confirmLabel: 'Confirm', cancelLabel: 'Cancel' });

const emit = defineEmits<{
  /** Fires when the popover opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];

  /** Fires when the reader dismisses without confirming — Cancel, Escape or an outside press. */
  cancel: [];

  /** Fires when `onConfirm` throws or its promise rejects; the popover stays open. */
  error: [error: unknown];
}>();

const attrs = useAttrs();
const slots = useSlots();
const titleId = useId();
const descriptionId = useId();

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const isOpen = controlled.value;

/** Whether a confirmation is awaiting its promise. */
const isPending = shallowRef(false);

/** @internal Bumped on every settle-relevant change, so a stale promise cannot close a newer request. */
let attempt = 0;

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

onScopeDispose(() => {
  attempt += 1;
});

/** Opens or dismisses the popover; a dismissal of an open popover reports `cancel`. */
function requestOpen(next: boolean): void {
  if (next && props.isDisabled) return;
  if (!next && isPending.value) return;
  const wasOpen = isOpen.value;
  controlled.setValue(next);
  if (wasOpen && !next) emit('cancel');
}

/** Runs the confirm callback, awaits a returned promise and closes once it resolves. */
async function confirm(): Promise<void> {
  if (isPending.value) return;
  const current = ++attempt;
  let outcome: unknown;
  try {
    outcome = props.onConfirm?.();
  } catch (error) {
    emit('error', error);
    return;
  }
  if (isThenable(outcome)) {
    isPending.value = true;
    try {
      await outcome;
    } catch (error) {
      if (current !== attempt) return;
      isPending.value = false;
      emit('error', error);
      return;
    }
    if (current !== attempt) return;
    isPending.value = false;
  }
  controlled.setValue(false);
}
</script>

<template>
  <Popover
    :open="isOpen"
    :placement="props.placement"
    :offset="props.offset"
    :dismiss-on-escape="!isPending"
    :dismiss-on-outside-click="!isPending"
    @update:open="requestOpen"
  >
    <PopoverTrigger as-child :aria-disabled="props.isDisabled || undefined">
      <slot />
    </PopoverTrigger>
    <PopoverContent
      :aria-labelledby="titleId"
      :aria-describedby="hasDescription ? descriptionId : undefined"
      :aria-busy="isPending || undefined"
      v-bind="attrs"
    >
      <div class="space-y-3">
        <div class="space-y-1">
          <p :id="titleId" class="text-sm font-medium text-foreground">{{ props.title }}</p>
          <p v-if="hasDescription" :id="descriptionId" class="text-sm text-muted-foreground">
            <slot name="description">{{ props.description }}</slot>
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" :is-disabled="isPending" @click="requestOpen(false)">
            {{ props.cancelLabel }}
          </Button>
          <Button variant="solid" size="sm" :tone="props.tone" :is-loading="isPending" @click="confirm">
            {{ props.confirmLabel }}
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
