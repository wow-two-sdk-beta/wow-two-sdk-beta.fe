<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';

export interface NumberInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The increment granularity of the stepper buttons and arrow keys. Default 1. */
  readonly step?: number;
  /** Accessible text for the increment action. */
  readonly incrementLabel?: string;
  /** Accessible text for the decrement action. */
  readonly decrementLabel?: string;

  /**
   * The value, controlled. The `v-model` binding target.
   *
   * Emits a finite number, or null when cleared. Invalid drafts do not commit.
   */
  readonly modelValue?: number | null;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: number | null;

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
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Minus, Plus } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

const MinusIcon = Minus;
const PlusIcon = Plus;

/** Renders a numeric input flanked by minus and plus buttons that step the value by `step`. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. Everything else is forwarded
   onto the inner `<input>` by hand, matching React's `{...props}` placement. */
defineOptions({ name: 'NumberInput', inheritAttrs: false });

const inputProps = withDefaults(defineProps<NumberInputProps>(), {
  step: 1,

  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form
     control context, and Vue casts an absent `boolean` prop to `false` — which would
     shadow the context with a hard "not disabled / not required / not read-only". */
  isDisabled: undefined,
  disabled: undefined,
  isRequired: undefined,
  required: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const props = useLocaleDefaults(inputProps, 'NumberInput', {
  incrementLabel: 'Increment',
  decrementLabel: 'Decrement',
});

const emit = defineEmits<{
  /** Fires when the reader types or steps the number — the `v-model` half. */
  'update:modelValue': [value: number | null];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<number | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const currentValue = controlled.value;

const root = useTemplateRef<HTMLInputElement>('root');

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  const input = event.target as HTMLInputElement;
  if (input.validity.badInput) return;
  const value = input.value === '' ? null : input.valueAsNumber;
  if (value !== null && !Number.isFinite(value)) return;
  controlled.setValue(value);
}

function adjust(direction: 1 | -1): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  const el = root.value;
  if (!el || typeof el.stepUp !== 'function') return;
  /* No argument — stepUp(n) steps n × the `step` attribute (already set on the input), not by n. */
  if (direction === 1) el.stepUp();
  else el.stepDown();
  /* The dispatched events drive this component's own `@input` (which re-reads `el.value`
     and fires the emits) and any fallthrough `input` / `change` listener the consumer bound. */
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

const finalState = computed(() => props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

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
      state: finalState.value,
      border: props.border,
      ring: props.ring,
    }),
    'pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
  ),
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(root, controlled.reset, () => {
  if (root.value) root.value.value = String(currentValue.value ?? '');
});

defineExpose({ el: root });
</script>

<template>
  <div :class="wrapperClass">
    <input
      ref="root"
      type="number"
      inputmode="decimal"
      :step="step"
      :id="inputId"
      :value="currentValue"
      :disabled="finalDisabled"
      :required="finalRequired"
      :readonly="finalReadOnly"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :class="inputClass"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
    />
    <div class="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
      <button
        type="button"
        :disabled="finalDisabled || finalReadOnly"
        :aria-label="props.decrementLabel"
        class="grid h-7 w-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-50"
        @click="adjust(-1)"
      >
        <Icon :icon="MinusIcon" :size="14" />
      </button>
      <button
        type="button"
        :disabled="finalDisabled || finalReadOnly"
        :aria-label="props.incrementLabel"
        class="grid h-7 w-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-50"
        @click="adjust(1)"
      >
        <Icon :icon="PlusIcon" :size="14" />
      </button>
    </div>
  </div>
</template>
