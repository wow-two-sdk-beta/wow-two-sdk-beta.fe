<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface LabelTextProps {
  /** The required state, showing a `*` indicator. Auto-derived from `FormControl.isRequired` when present. */
  readonly isRequired?: boolean;

  /** The visual size. Default `md`. */
  readonly size?: Size;

  /**
   * The id of the labelled control — React's `htmlFor`. Auto-filled from
   * `FormControl` context when omitted.
   */
  readonly htmlFor?: string;

  /** The DOM spelling of {@link LabelTextProps.htmlFor}, which wins when both are set. */
  readonly for?: string;

  /**
   * The label's own id. An explicit id detaches the node from the context's
   * `labelId`, so the label stops registering as the context's naming chrome.
   */
  readonly id?: string;
}

/* Sizes not listed fall back to the `md` row at the call site. */
const SizeClass: Partial<Record<Size, string>> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Size as SizeValue } from '../../../foundation/styles';
import { useFormControl, useFormControlChrome } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';

/** Renders a `<label>` that takes `htmlFor` and `id` from `FormControl`, plus the required-field asterisk. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'LabelText', inheritAttrs: false });

/* `children` has no prop counterpart — the label copy is the default slot. */
const props = withDefaults(defineProps<LabelTextProps>(), {
  size: SizeValue.Md,
  /* `isRequired` must stay `undefined` when absent: the value falls back to the form
     control's own `isRequired`, and Vue's Boolean casting would turn an absent prop into
     an explicit `false` that shadows the context. */
  isRequired: undefined,
});

defineSlots<{
  /** The label copy, rendered before the required asterisk. */
  default(): unknown;
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

/* Registration flips the context's `labelledBy` on — widgets that name themselves via
   `aria-labelledby` reference the label only while it exists. An explicit `id` prop
   detaches the node from the context's labelId. Passed as a getter to stay reactive. */
useFormControlChrome('label', () => props.id == null);

/* Follows the nearest `DataRegion` or `Field` skeleton: the label keeps its line and turns into a bar. */
const skeleton = useSkeletonState();

const isRequired = computed(() => props.isRequired ?? ctx?.isRequired ?? false);
const labelFor = computed(() => props.for ?? props.htmlFor ?? ctx?.id);
const labelId = computed(() => props.id ?? ctx?.labelId);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    SizeClass[props.size] ?? SizeClass.md,
    'font-medium text-foreground',
    ctx?.isDisabled && 'opacity-60',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLLabelElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <label
    ref="root"
    :for="labelFor"
    :id="labelId"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value"><slot /></SkeletonStateLine>
    <span
      v-if="isRequired"
      :class="cn('ml-0.5 text-destructive-soft-foreground', skeleton.isSkeleton.value && 'invisible')"
      aria-hidden="true"
      >*</span
    >
  </label>
</template>
