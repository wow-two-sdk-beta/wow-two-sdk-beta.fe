<script lang="ts">
import type { RadioInputProps } from '../radioInput';

export interface RadioFieldProps extends RadioInputProps {
  /** The right-side label. Fill the `label` slot instead for richer content. */
  readonly label?: string | number;

  /** The smaller helper / description below. Fill the `description` slot for richer content. */
  readonly description?: string | number;

  /**
   * The wrap-element class (the `<label>`).
   *
   * React put `className` on the inner `RadioInput` and `wrapperClassName` on the `<label>`;
   * that split is preserved, so Vue's `class` fallthrough attr reaches the RADIO, not the
   * root. Style the wrapper through this prop.
   */
  readonly wrapperClassName?: string;

  /**
   * The key this item contributes to a surrounding `RadioGroup`'s selection.
   *
   * React read it off the cloned child (`ChildLike.value`); here the group provides a
   * context and this prop is what the item registers under. Ignored outside a group.
   */
  readonly value?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { FormControlProvider, useFormControl } from '../../../foundation/primitives';
import { useRadioGroup } from '../radioGroup/RadioGroupContext';
import RadioInput from '../radioInput/RadioInput.vue';

/** Renders a radio, its right-side label and an optional description in one clickable `<label>`. */
/* `inheritAttrs: false` so `class` reaches the inner RadioInput (React's `className`) rather
   than landing on the `<label>`. */
defineOptions({ name: 'RadioField', inheritAttrs: false });

const props = withDefaults(defineProps<RadioFieldProps>(), {
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
const group = useRadioGroup();
/* Inside a `RadioGroup` the group already claimed the Field's id, so siblings fall back
   to their own generated one — React's fresh per-item provider did the same. */
const inputId = computed(() => props.id ?? (group ? generated : (ctx?.id ?? generated)));

const isInGroup = computed(() => group !== null);
const groupName = computed(() => group?.name());
const groupChecked = computed(() => group?.isSelected(props.value) ?? false);
const groupDisabled = computed(() => props.isDisabled ?? props.disabled ?? group?.isDisabled());
const groupInvalid = computed(() => group?.isInvalid() ?? false);
const groupRequired = computed(() => props.isRequired ?? props.required ?? group?.isRequired() ?? false);

function onGroupChange(): void {
  group?.select(props.value);
}

const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

/* No `defineEmits`: the consumer's `v-model` listeners must stay in `useAttrs()` to reach
   the inner `RadioInput` — see the CheckboxField note. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/** This component's own props must not reach the inner `RadioInput`. */
const radioProps = computed(() => {
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

const radioClass = computed(() => attrs.class as ClassValue);

const inner = useTemplateRef<{ el: HTMLInputElement | null }>('inner');

/* After every pick in the group — this item's or a sibling's — put this radio back on the model once the owner has
   answered: a controlled owner that declines leaves the DOM where the model is, not where the click moved it. */
watch(
  () => group?.pickCount(),
  () => {
    const radio = inner.value?.el;
    if (radio) radio.checked = groupChecked.value;
  },
  { flush: 'post' },
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: computed(() => inner.value?.el ?? null) });
</script>

<template>
  <label :for="inputId" :class="wrapperClass">
    <!-- Inside a group the item gets a FRESH provider — React wrapped each cloned child in
         one so siblings never adopt the surrounding Field's id or `describedBy`, while the
         group's disabled/invalid flags still cascade. -->
    <FormControlProvider
      v-if="isInGroup"
      :is-disabled="groupDisabled"
      :is-invalid="groupInvalid"
      :is-required="groupRequired"
    >
      <RadioInput
        ref="inner"
        v-bind="{ ...radioProps, ...passthroughAttrs }"
        :id="inputId"
        :name="groupName"
        :model-value="groupChecked"
        :class="radioClass"
        @change="onGroupChange"
      />
    </FormControlProvider>
    <RadioInput v-else ref="inner" v-bind="{ ...radioProps, ...passthroughAttrs }" :id="inputId" :class="radioClass" />
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
