<script lang="ts">
import type { CheckboxInputProps } from '../checkboxInput';

export interface CheckboxFieldProps extends CheckboxInputProps {
  /** The right-side label. Fill the `label` slot instead for richer content. */
  readonly label?: string | number;

  /** The smaller helper / description below. Fill the `description` slot for richer content. */
  readonly description?: string | number;

  /**
   * The wrap-element class (the `<label>`).
   *
   * React put `className` on the inner `CheckboxInput` and `wrapperClassName` on the `<label>`;
   * that split is preserved, so Vue's `class` fallthrough attr reaches the CHECKBOX, not
   * the root. Style the wrapper through this prop.
   */
  readonly wrapperClassName?: string;

  /**
   * The key this item contributes to a surrounding `CheckboxGroup`'s selection.
   *
   * React read it off the cloned child (`ChildLike.value`); here the group provides a
   * context and this prop is what the item registers under. Ignored outside a group.
   */
  readonly value?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { FormControlProvider, useFormControl } from '../../../foundation/primitives';
import { useCheckboxGroup } from '../checkboxGroup/CheckboxGroupContext';
import CheckboxInput from '../checkboxInput/CheckboxInput.vue';

/** Renders a checkbox, its right-side label and an optional description in one clickable `<label>`. */
/* `inheritAttrs: false` so `class` reaches the inner CheckboxInput (React's `className`) rather
   than landing on the `<label>`. */
defineOptions({ name: 'CheckboxField', inheritAttrs: false });

const props = withDefaults(defineProps<CheckboxFieldProps>(), {
  /* Explicit `undefined` for every inherited boolean: Vue casts an absent `boolean` prop to `false`, and this
     wrapper forwards its props — a cast `false` would override the inner input's own default and the Field context. */
  modelValue: undefined,
  defaultValue: undefined,
  isIndeterminate: undefined,
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
/* Context id wins over the generated fallback — inside a `Field`/`form.Field` the
   surrounding LabelText's `htmlFor` targets `ctx.id`, so the box must carry it. Inside a
   `CheckboxGroup` the group already claimed that id, so siblings fall back to their own. */
const ctx = useFormControl();
const group = useCheckboxGroup();
const inputId = computed(() => props.id ?? (group ? generated : (ctx?.id ?? generated)));

const isInGroup = computed(() => group !== null);
const groupChecked = computed(() => group?.isSelected(props.value) ?? false);
const groupDisabled = computed(() => props.isDisabled ?? props.disabled ?? group?.isDisabled());
const groupInvalid = computed(() => group?.isInvalid() ?? false);

function onGroupChange(): void {
  group?.toggle(props.value);
}

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

/*
 * No `defineEmits` on purpose: `update:modelValue` are NOT re-declared, so a
 * consumer's listeners stay in `useAttrs()` and reach `CheckboxInput` through the passthrough —
 * declaring them here would strip the listeners and silently break `v-model`.
 */
const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/** This component's own props must not reach the inner `CheckboxInput`. */
const checkboxProps = computed(() => {
  const {
    label: _label,
    description: _description,
    wrapperClassName: _wrapperClassName,
    value: _value,
    ...rest
  } = props;
  return rest;
});

const wrapperClass = computed(() => cn('flex items-start gap-2.5 cursor-pointer', props.wrapperClassName));

const checkboxClass = computed(() => attrs.class as ClassValue);

const inner = useTemplateRef<{ el: HTMLInputElement | null }>('inner');

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => inner.value?.el ?? null) });
</script>

<template>
  <label :for="inputId" :class="wrapperClass">
    <!-- Inside a group the item gets a FRESH provider — React wrapped each cloned child in
         one so siblings never adopt the surrounding Field's id or `describedBy`, while the
         group's disabled/invalid flags still cascade. -->
    <FormControlProvider v-if="isInGroup" :is-disabled="groupDisabled" :is-invalid="groupInvalid">
      <CheckboxInput
        ref="inner"
        v-bind="{ ...checkboxProps, ...passthroughAttrs }"
        :id="inputId"
        :model-value="groupChecked"
        :class="checkboxClass"
        @change="onGroupChange"
      />
    </FormControlProvider>
    <CheckboxInput
      v-else
      ref="inner"
      v-bind="{ ...checkboxProps, ...passthroughAttrs }"
      :id="inputId"
      :class="checkboxClass"
    />
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
