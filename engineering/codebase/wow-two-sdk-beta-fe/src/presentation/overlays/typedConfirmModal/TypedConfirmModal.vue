<script lang="ts">
import type { ColorTone } from '../../../foundation/styles';

/**
 * Defines props for the blocking dialog that runs a dangerous action once the reader confirms it — by typing its
 * target's ID when `expected` is set, by pressing the action alone when it is not.
 */
export interface TypedConfirmModalProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The question the dialog asks — it names the dialog. */
  readonly title: string;

  /** The consequence spelled out under the title. The `description` slot is the rich override. */
  readonly description?: string;

  /**
   * The exact text the reader types to enable the action — the target's ID or name. Omit it for a plain confirm with
   * no typed field: the same dialog asks once, so one call site serves a guarded and an unguarded target.
   */
  readonly expected?: string;

  /**
   * Whether the action may run, beside the typed match — `false` while a required input in the default slot, such as
   * a reason, is still empty. Default `true`.
   */
  readonly canConfirm?: boolean;

  /** The field's label template; `{expected}` marks the expected text. Default `TypedConfirmField`'s. */
  readonly label?: string;

  /** The helper beneath the field. */
  readonly helper?: string;

  /** The refusal shown under the field — the reason the API gave for the last failed confirm. */
  readonly error?: string;

  /** The confirm button text. Default `"Confirm"`, localized. */
  readonly confirmLabel?: string;

  /** The cancel button text. Default `"Cancel"`, localized. */
  readonly cancelLabel?: string;

  /** The confirm button tone. Default `danger`. */
  readonly tone?: ColorTone;

  /**
   * Runs with the typed text once the reader confirms — send it as the API's `confirm`; the text is empty without
   * `expected`. Returning a promise keeps the
   * dialog open with a busy confirm button until it settles. The dialog closes on success and stays open, emitting
   * `error`, when it throws, rejects or settles to a failed `Result`.
   *
   * Kept a PROP, not an emit: the dialog awaits what it RETURNS, which an emit cannot carry. `@confirm` binds it all
   * the same.
   */
  readonly onConfirm?: (typed: string) => unknown;
}

/** @internal Whether a value can be awaited. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/** @internal Whether a value is a failed `Result` — the carrier an SDK mutation settles to. */
function isFailedResult(value: unknown): value is { readonly ok: false; readonly failure: unknown } {
  return typeof value === 'object' && value !== null && (value as { ok?: unknown }).ok === false && 'failure' in value;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, useAttrs, useSlots, watch } from 'vue';
import { ButtonType } from '../../../foundation/dom';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useControlled } from '../../../foundation/state';
import Button from '../../actions/button/Button.vue';
import Alert from '../../feedback/alert/Alert.vue';
import TypedConfirmField from '../../forms/typedConfirmField/TypedConfirmField.vue';
import AlertModal from '../alertModal/AlertModal.vue';
import AlertModalContent from '../alertModal/AlertModalContent.vue';
import OverlayBody from '../OverlayBody.vue';
import OverlayDescription from '../OverlayDescription.vue';
import OverlayFooter from '../OverlayFooter.vue';
import OverlayHeader from '../OverlayHeader.vue';
import OverlayTitle from '../OverlayTitle.vue';

/**
 * Renders a centred alert dialog — a bottom sheet on phones — that asks the reader to type a target's ID before a
 * dangerous action runs; the confirm button stays disabled until the typed text matches exactly. Without `expected` it
 * is a plain confirm that still awaits the action, shows its refusal and stays open on failure.
 */
defineOptions({ name: 'TypedConfirmModal', inheritAttrs: false });

defineSlots<{
  /** What the reader weighs before confirming — facts, risks, a reason field — above the typed field. */
  default?(): unknown;

  /** The rich override for the `description` prop. */
  description?(): unknown;

  /** The confirm button's leading icon. */
  'confirm-icon'?(): unknown;
}>();

const componentProps = withDefaults(defineProps<TypedConfirmModalProps>(), {
  open: undefined,
  defaultOpen: false,
  description: undefined,
  expected: undefined,
  canConfirm: true,
  label: undefined,
  helper: undefined,
  error: undefined,
  tone: 'danger',
  onConfirm: undefined,
});
const props = useLocaleDefaults(componentProps, 'TypedConfirmModal', {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
});

const emit = defineEmits<{
  /** Fires when the dialog opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];

  /** Fires when the reader dismisses without confirming — Cancel or Escape. */
  cancel: [];

  /** Fires when `onConfirm` throws, rejects or settles to a failed `Result` (its failure); the dialog stays open. */
  error: [error: unknown];
}>();

const attrs = useAttrs();
const slots = useSlots();

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const isOpen = controlled.value;

/** The text the reader typed; it clears whenever the dialog opens or the target changes. */
const typed = shallowRef('');

/** Whether a confirmation is awaiting its promise. */
const isPending = shallowRef(false);

/** @internal Bumped on every settle-relevant change, so a stale promise cannot close a newer request. */
let attempt = 0;

/** Whether the dialog asks for the typed text at all. */
const isTyped = computed(() => props.expected !== undefined);

const isConfirmed = computed(
  () => props.canConfirm && (!isTyped.value || (props.expected!.length > 0 && typed.value === props.expected)),
);

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

watch(isOpen, (open) => {
  if (!open) return;
  typed.value = '';
});

watch(
  () => props.expected,
  () => {
    typed.value = '';
  },
);

onScopeDispose(() => {
  attempt += 1;
});

/** Opens or dismisses the dialog; a dismissal of an open dialog reports `cancel`. */
function requestOpen(next: boolean): void {
  if (!next && isPending.value) return;
  const wasOpen = isOpen.value;
  controlled.setValue(next);
  if (wasOpen && !next) emit('cancel');
}

/** Runs the confirm callback with the typed text, awaits a returned promise and closes once it succeeds. */
async function confirm(): Promise<void> {
  if (!isConfirmed.value || isPending.value) return;
  const current = ++attempt;
  let outcome: unknown;
  try {
    outcome = props.onConfirm?.(typed.value);
  } catch (error) {
    emit('error', error);
    return;
  }
  if (isThenable(outcome)) {
    isPending.value = true;
    try {
      outcome = await outcome;
    } catch (error) {
      if (current !== attempt) return;
      isPending.value = false;
      emit('error', error);
      return;
    }
    if (current !== attempt) return;
    isPending.value = false;
  }
  if (isFailedResult(outcome)) {
    emit('error', outcome.failure);
    return;
  }
  controlled.setValue(false);
}
</script>

<template>
  <AlertModal :open="isOpen" :dismiss-on-escape="!isPending" @update:open="requestOpen">
    <AlertModalContent v-bind="attrs" :aria-busy="isPending || undefined">
      <form class="flex min-h-0 flex-1 flex-col" novalidate @submit.prevent="confirm">
        <OverlayHeader>
          <OverlayTitle>{{ props.title }}</OverlayTitle>
          <OverlayDescription v-if="hasDescription">
            <slot name="description">{{ props.description }}</slot>
          </OverlayDescription>
        </OverlayHeader>
        <OverlayBody class="flex flex-col gap-4">
          <slot />
          <TypedConfirmField
            v-if="isTyped"
            v-model="typed"
            :expected="props.expected ?? ''"
            :label="props.label"
            :helper="props.helper"
            :is-read-only="isPending"
          />
          <Alert v-if="props.error" role="alert" severity="danger" :description="props.error" />
        </OverlayBody>
        <OverlayFooter>
          <Button
            :type="ButtonType.Button"
            variant="outline"
            tone="neutral"
            :is-disabled="isPending"
            @click="requestOpen(false)"
          >
            {{ props.cancelLabel }}
          </Button>
          <Button
            :type="ButtonType.Submit"
            variant="solid"
            :tone="props.tone"
            :is-disabled="!isConfirmed"
            :is-loading="isPending"
          >
            <template v-if="slots['confirm-icon']" #leading><slot name="confirm-icon" /></template>
            {{ props.confirmLabel }}
          </Button>
        </OverlayFooter>
      </form>
    </AlertModalContent>
  </AlertModal>
</template>
