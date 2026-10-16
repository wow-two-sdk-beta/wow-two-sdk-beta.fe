<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { InputSize, InputState } from '../InputStyles';

export interface PasswordInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The visibility-toggle button's presence. Default true. */
  readonly hasToggle?: boolean;

  /** The value, controlled. The `v-model` binding target. */
  readonly modelValue?: string | number;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: string | number;

  /** The autofill hint. Defaults to `current-password`. */
  readonly autocomplete?: string;

  /** camelCase alias of {@link PasswordInputProps.autocomplete}; the DOM spelling wins. */
  readonly autoComplete?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
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
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Eye, EyeOff } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

/** Renders a password field with an optional eye button that reveals the typed characters. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'PasswordInput', inheritAttrs: false });

const props = withDefaults(defineProps<PasswordInputProps>(), {
  hasToggle: true,
  autocomplete: undefined,
  autoComplete: undefined,
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow it. */
  isDisabled: undefined,
  disabled: undefined,
  isRequired: undefined,
  required: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the password — the `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<string | number>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', String(next));
  },
});

const currentValue = controlled.value;

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue((event.target as HTMLInputElement).value);
}

const visible = ref(false);

function toggle(): void {
  visible.value = !visible.value;
}

const inputType = computed(() => (visible.value ? 'text' : 'password'));
const toggleLabel = computed(() => (visible.value ? 'Hide password' : 'Show password'));
const toggleIcon = computed(() => (visible.value ? EyeOff : Eye));

const autocompleteValue = computed(() => props.autocomplete ?? props.autoComplete ?? 'current-password');

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled ?? false);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'value']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('relative', attrs.class as ClassValue));

const inputClass = computed(() =>
  cn(
    inputBaseVariants({
      size: props.size,
      state: props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default),
    }),
    props.hasToggle && 'pr-10',
  ),
);

const input = useTemplateRef<HTMLInputElement>('input');

/** The rendered `<input>`. */
useNativeFormReset(input, controlled.reset, () => {
  if (input.value) input.value.value = String(currentValue.value ?? '');
});

defineExpose({ el: input });
</script>

<template>
  <div :class="wrapperClass">
    <input
      ref="input"
      :type="inputType"
      :autocomplete="autocompleteValue"
      :spellcheck="false"
      :id="inputId"
      :disabled="finalDisabled"
      :required="finalRequired"
      :readonly="finalReadOnly"
      :value="currentValue"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :class="inputClass"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
    />
    <button
      v-if="hasToggle"
      type="button"
      :disabled="finalDisabled"
      :aria-label="toggleLabel"
      :aria-pressed="visible"
      class="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-50"
      @click="toggle"
    >
      <Icon :icon="toggleIcon" :size="16" />
    </button>
  </div>
</template>
