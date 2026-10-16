<script lang="ts">
import type { Size } from '../../../foundation/styles';
import type { RadioInputProps } from '../radioInput';

export interface ChoiceCardProps extends Omit<RadioInputProps, 'size'> {
  /** The card title. Fill the `label` slot instead for richer content. */
  readonly label?: string | number;

  /** The description under the title. Fill the `description` slot for richer content. */
  readonly description?: string | number;

  /** The optional icon rendered beside the label. Fill the `icon` slot with the icon element. */
  readonly icon?: string | number;

  /** The card size. Default `md`. */
  readonly size?: Size;

  /**
   * The key this item contributes to a surrounding `RadioGroup`'s selection.
   *
   * React read it off the cloned child (`ChildLike.value`); here the group provides a
   * context and this prop is what the item registers under. Ignored outside a group.
   */
  readonly value?: string;
}

/* Sizes not listed fall back to the `md` row at the call site. */
const SizeClass: Partial<Record<Size, string>> = {
  sm: 'p-3 text-xs',
  md: 'p-4 text-sm',
  lg: 'p-5 text-base',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Size as SizeValue } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { FormControlProvider, useFormControl } from '../../../foundation/primitives';
import { useRadioGroup } from '../radioGroup/RadioGroupContext';
import RadioInput from '../radioInput/RadioInput.vue';

/** Renders a radio as a whole clickable card carrying a title, description and optional icon. */
/* `inheritAttrs: false` so `class` folds into the card's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ChoiceCard', inheritAttrs: false });

const props = withDefaults(defineProps<ChoiceCardProps>(), {
  /* Explicit `undefined` for every inherited boolean: Vue casts an absent `boolean` prop to `false`, and this
     wrapper forwards its props — a cast `false` would override the inner input's own default and the Field context. */
  isDisabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  size: SizeValue.Md,
  modelValue: undefined,
  defaultValue: undefined,
  disabled: undefined,
  required: undefined,
});

defineSlots<{
  label?(): unknown;
  description?(): unknown;
  icon?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();

const generated = useId();
/* Context id wins over the generated fallback (see CheckboxField) — inside a
   `Field`/`form.Field` the surrounding LabelText's `htmlFor` targets `ctx.id`, so the card's
   radio must carry it. Inside a `RadioGroup` the per-item context supplies a unique id. */
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

const hasIcon = computed(() => Boolean(props.icon) || Boolean(slots.icon));
const hasDescription = computed(() => Boolean(props.description) || Boolean(slots.description));

/* No `defineEmits`: the consumer's `v-model` listeners must stay in `useAttrs()` to reach
   the inner `RadioInput` — see the CheckboxField note. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/** This component's own props must not reach the inner `RadioInput`. */
const radioProps = computed(() => {
  const { label: _label, description: _description, icon: _icon, size: _size, value: _value, ...rest } = props;
  return rest;
});

const rootClass = computed(() =>
  cn(
    'group relative block cursor-pointer rounded-lg border border-input bg-card text-card-foreground transition-colors',
    'hover:border-border-strong has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30',
    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
    SizeClass[props.size] ?? SizeClass.md,
    attrs.class as ClassValue,
  ),
);

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
  <label :for="inputId" :class="rootClass">
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
        class="absolute right-3 top-3"
        @change="onGroupChange"
      />
    </FormControlProvider>
    <RadioInput
      v-else
      ref="inner"
      v-bind="{ ...radioProps, ...passthroughAttrs }"
      :id="inputId"
      class="absolute right-3 top-3"
    />
    <div class="flex items-start gap-3 pr-7">
      <span v-if="hasIcon" class="text-muted-foreground">
        <slot name="icon">{{ icon }}</slot>
      </span>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-foreground">
          <slot name="label">{{ label }}</slot>
        </div>
        <div v-if="hasDescription" class="mt-0.5 text-muted-foreground">
          <slot name="description">{{ description }}</slot>
        </div>
      </div>
    </div>
  </label>
</template>
