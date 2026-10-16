<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface RadioInputProps {
  /** The control size. */
  readonly size?: Size;

  /** The checked state, controlled. The `v-model` binding target. */
  readonly modelValue?: boolean;

  /** The initial checked state when uncontrolled. */
  readonly defaultValue?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;

  /** Draws the circle as its own placeholder, inert; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}

/* Sizes not listed fall back to the `md` row at the call site. */
const SizeClass: Partial<Record<Size, string>> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, nextTick, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Size as SizeValue } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';

/** Renders a native radio behind a custom visual; same-`name` siblings form one mutually exclusive group. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'RadioInput', inheritAttrs: false });

const props = withDefaults(defineProps<RadioInputProps>(), {
  size: SizeValue.Md,
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow it. */
  modelValue: undefined,
  defaultValue: undefined,
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
  isSkeleton: undefined,
});

const emit = defineEmits<{
  /** Fires when the user picks this radio — the `v-model` half. */
  'update:modelValue': [checked: boolean];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<boolean>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? false,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const isChecked = controlled.value;

function onChange(event: Event): void {
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) {
    (event.target as HTMLInputElement).checked = isChecked.value;
    return;
  }
  const box = event.target as HTMLInputElement;
  controlled.setValue(box.checked);
  /* A controlled owner that declines the change keeps its prop, and Vue skips an unchanged binding — so the
     native box would keep the reader's toggle. Re-syncs it once the owner's update has flushed. */
  void nextTick(() => {
    box.checked = isChecked.value;
  });
}

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? ctx?.isReadOnly ?? false);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const isInvalid = computed(() => ctx?.isInvalid || undefined);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'checked']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() =>
  cn('relative inline-flex shrink-0', SizeClass[props.size] ?? SizeClass.md, attrs.class as ClassValue),
);

const VisualClass = cn(
  'pointer-events-none grid h-full w-full place-items-center rounded-full border border-input bg-background transition-colors',
  'peer-checked:border-primary-soft-foreground',
  /* `peer-checked:` cannot reach descendants — the dot's opacity is gated by a child selector on this peer span. */
  '[&>span]:opacity-0 peer-checked:[&>span]:opacity-100',
  'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1',
  'peer-disabled:opacity-50',
);

/* In skeleton mode the circle keeps its size and border width as the placeholder; the dot hides. */
const skeleton = useSkeletonState(() => props.isSkeleton);

const visualClass = computed(() =>
  skeleton.isSkeleton.value
    ? cn('pointer-events-none grid h-full w-full place-items-center rounded-full border', skeleton.boxClass.value)
    : VisualClass,
);

const input = useTemplateRef<HTMLInputElement>('input');

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(input, controlled.reset, () => {
  if (input.value) input.value.checked = Boolean(isChecked.value);
});

defineExpose({ el: input });
</script>

<template>
  <span
    :class="wrapperClass"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :inert="skeleton.isSkeleton.value || undefined"
  >
    <input
      ref="input"
      type="radio"
      :id="inputId"
      :disabled="finalDisabled"
      :required="finalRequired"
      :checked="isChecked"
      :aria-invalid="isInvalid"
      class="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      v-bind="passthroughAttrs"
      @change="onChange"
      @click="finalReadOnly && $event.preventDefault()"
      :aria-readonly="finalReadOnly || undefined"
    />
    <span aria-hidden="true" :class="visualClass">
      <span class="h-2 w-2 rounded-full bg-primary-soft-foreground" />
    </span>
  </span>
</template>
