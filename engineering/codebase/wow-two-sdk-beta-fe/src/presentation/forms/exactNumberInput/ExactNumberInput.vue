<script lang="ts">
import type { ExactNumber } from '../../../foundation/numbers';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';
import type { NativeInputAttributes } from '../NativeControlAttributes';

export interface ExactNumberInputProps extends /* @vue-ignore */ NativeInputAttributes<'onInvalid'> {
  readonly modelValue?: ExactNumber | null;
  readonly defaultValue?: ExactNumber | null;
  readonly size?: InputSize;
  readonly state?: InputState;
  readonly border?: InputBorder;
  readonly ring?: InputRing;
  readonly id?: string;
  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readOnly?: boolean;
  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;
  /** Browser validity text for an incomplete or invalid decimal draft. */
  readonly invalidMessage?: string;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { ExactNumber as Numbers, type NumberFailure } from '../../../foundation/numbers';
import { ResultExtensions, type Result } from '../../../foundation/results';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants, InputState as InputStates } from '../InputStyles';
import { useNativeFormReset } from '../UseNativeFormReset';

defineOptions({ name: 'ExactNumberInput', inheritAttrs: false });
const rawProps = withDefaults(defineProps<ExactNumberInputProps>(), {
  isDisabled: undefined,
  disabled: undefined,
  isRequired: undefined,
  required: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const props = useLocaleDefaults(rawProps, 'ExactNumberInput', {
  invalidMessage: 'Enter a complete decimal number using a dot as the decimal separator.',
});
const emit = defineEmits<{
  'update:modelValue': [value: ExactNumber | null];
  'draft-change': [draft: string];
  invalid: [failure: NumberFailure, draft: string];
}>();
const attrs = useAttrs();
const context = useFormControl();
const controlled = useControlled<ExactNumber | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (value) => emit('update:modelValue', value),
});
const root = useTemplateRef<HTMLInputElement>('root');
const draft = ref(controlled.value.value?.toString() ?? '');
const dirty = ref(false);
const composing = ref(false);
const failure = shallowRef<NumberFailure | null>(null);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? context?.isDisabled ?? false);
const finalReadOnly = computed(
  () => props.isReadOnly ?? props.readonly ?? props.readOnly ?? context?.isReadOnly ?? false,
);
const inputId = computed(() => props.id ?? context?.id);
const finalRequired = computed(() => props.isRequired ?? props.required ?? context?.isRequired);
const isInvalid = computed(() => Boolean(failure.value || context?.isInvalid || props.state === InputStates.Invalid));
const describedBy = computed(
  () => [context?.describedBy, attrs['aria-describedby']].filter(Boolean).join(' ') || undefined,
);
const finalState = computed(() => (isInvalid.value ? InputStates.Invalid : (props.state ?? InputStates.Default)));
const ownedAttributes = new Set(['class', 'value', 'type', 'aria-invalid', 'aria-describedby']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !ownedAttributes.has(key))),
);
const rootClass = computed(() =>
  cn(
    inputBaseVariants({ size: props.size, state: finalState.value, border: props.border, ring: props.ring }),
    attrs.class as ClassValue,
  ),
);

function restore(): void {
  draft.value = controlled.value.value?.toString() ?? '';
  failure.value = null;
  dirty.value = false;
  if (root.value) {
    root.value.value = draft.value;
    root.value.setCustomValidity('');
  }
}

function onInput(event: Event): void {
  if (finalDisabled.value || finalReadOnly.value) {
    restore();
    return;
  }
  draft.value = (event.target as HTMLInputElement).value;
  dirty.value = true;
  failure.value = null;
  root.value?.setCustomValidity('');
  emit('draft-change', draft.value);
}

/** Commits one complete JSON decimal token, or null; malformed drafts remain editable. */
function commit(): Result<ExactNumber | null, NumberFailure> {
  if (finalDisabled.value || finalReadOnly.value || composing.value || !dirty.value)
    return ResultExtensions.ok(controlled.value.value);
  const parsed = draft.value === '' ? ResultExtensions.ok(null) : Numbers.parse(draft.value);
  if (!parsed.ok) {
    failure.value = parsed.failure;
    root.value?.setCustomValidity(props.invalidMessage);
    emit('invalid', parsed.failure, draft.value);
    return parsed;
  }
  dirty.value = false;
  failure.value = null;
  root.value?.setCustomValidity('');
  const current = controlled.value.value;
  // Equal spelling does not require replacing immutable identity or emitting another change.
  if (current?.toString() !== parsed.value?.toString()) controlled.setValue(parsed.value);
  void nextTick(() => {
    if (!dirty.value) restore();
  });
  return parsed;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing || composing.value) return;
  if (event.key === 'Enter' && !commit().ok) event.preventDefault();
  if (event.key === 'Escape' && !finalDisabled.value && !finalReadOnly.value) {
    event.preventDefault();
    restore();
  }
}

watch(controlled.value, restore, { flush: 'sync' });
watch(
  () => props.invalidMessage,
  (message) => {
    if (failure.value) root.value?.setCustomValidity(message);
  },
);
useNativeFormReset(root, controlled.reset, restore);
defineExpose({ el: root, commit, restore });
</script>

<template>
  <input
    ref="root"
    v-bind="passthroughAttrs"
    type="text"
    inputmode="decimal"
    :id="inputId"
    :value="draft"
    :disabled="finalDisabled"
    :required="finalRequired"
    :readonly="finalReadOnly"
    :aria-invalid="isInvalid || undefined"
    :aria-describedby="describedBy"
    :class="rootClass"
    @input="onInput"
    @blur="commit"
    @keydown="onKeydown"
    @compositionstart="composing = true"
    @compositionend="
      composing = false;
      onInput($event);
    "
  />
</template>
