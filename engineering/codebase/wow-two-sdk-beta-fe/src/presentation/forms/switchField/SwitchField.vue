<script lang="ts">
import type { Side } from '../../../foundation/styles';
import type { SwitchInputProps } from '../switchInput';

export interface SwitchFieldProps extends SwitchInputProps {
  /** The label. Fill the `label` slot instead for richer content. */
  readonly label?: string | number;

  /** The smaller helper / description below. Fill the `description` slot for richer content. */
  readonly description?: string | number;

  /** The switch placement — on the left (default) or right of the label. */
  readonly side?: Side;

  /**
   * The wrap-element class (the `<label>`).
   *
   * React put `className` on the inner `SwitchInput` and `wrapperClassName` on the `<label>`;
   * that split is preserved, so Vue's `class` fallthrough attr reaches the SWITCH, not the
   * root. Style the wrapper through this prop.
   */
  readonly wrapperClassName?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Side as SideValue } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';
import SwitchInput from '../switchInput/SwitchInput.vue';

/** Renders a switch, its label and an optional description in one clickable `<label>`; `side` picks the order. */
/* `inheritAttrs: false` so `class` reaches the inner SwitchInput (React's `className`) rather
   than landing on the `<label>`. */
defineOptions({ name: 'SwitchField', inheritAttrs: false });

const props = withDefaults(defineProps<SwitchFieldProps>(), {
  side: SideValue.Left,
  /* Explicit `undefined` for every inherited boolean: Vue casts an absent `boolean` prop to `false`, and this
     wrapper forwards its props — a cast `false` would override the inner input's own default and the Field context. */
  modelValue: undefined,
  defaultValue: undefined,
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});

defineSlots<{
  label?(): unknown;
  description?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

const generated = useId();
/* Context id wins over the generated fallback (see CheckboxField). */
const ctx = useFormControl();
const inputId = computed(() => props.id ?? ctx?.id ?? generated);

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

/* No `defineEmits`: the consumer's `v-model` listeners must stay in `useAttrs()` to reach
   the inner `SwitchInput` — see the CheckboxField note. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/** This component's own props must not reach the inner `SwitchInput`. */
const switchProps = computed(() => {
  const { label: _label, description: _description, side: _side, wrapperClassName: _wrapperClassName, ...rest } = props;
  return rest;
});

const wrapperClass = computed(() =>
  cn(
    'flex cursor-pointer items-start gap-3',
    props.side === SideValue.Right && 'flex-row-reverse justify-between',
    props.wrapperClassName,
  ),
);

const switchClass = computed(() => attrs.class as ClassValue);

const inner = useTemplateRef<{ el: HTMLInputElement | null }>('inner');

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => inner.value?.el ?? null) });
</script>

<template>
  <label :for="inputId" :class="wrapperClass">
    <SwitchInput ref="inner" v-bind="{ ...switchProps, ...passthroughAttrs }" :id="inputId" :class="switchClass" />
    <span class="flex flex-col gap-0.5 text-sm">
      <span class="font-medium text-foreground">
        <slot name="label">{{ label }}</slot>
      </span>
      <span v-if="hasDescription" class="text-muted-foreground">
        <slot name="description">{{ description }}</slot>
      </span>
    </span>
  </label>
</template>
