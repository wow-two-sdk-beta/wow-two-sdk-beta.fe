<script lang="ts">
/** Defines the colour a meta item's icon and text take. */
export const MetaInlineItemTone = {
  /** Refers to the surrounding text colour. */
  Default: 'default',
  /** Refers to a live, positive state, such as an event that is on now. */
  Success: 'success',
  /** Refers to a past or inactive state, such as an event that has ended. */
  Muted: 'muted',
} as const;

export type MetaInlineItemTone = (typeof MetaInlineItemTone)[keyof typeof MetaInlineItemTone];

/** Defines props for one icon-led item of a meta line. */
export interface MetaInlineItemProps {
  /**
   * The fuller phrase assistive technology reads in place of the visible text — `posted 3 days ago` for `3 days`.
   * The visible text is then hidden from assistive technology.
   */
  readonly label?: string;

  /** The colour of the item's icon and text. Default `default`. */
  readonly tone?: MetaInlineItemTone;
}

/* `muted` and `success` use the text tokens, which hold AA on page surfaces and on a dark media panel alike. */
const ToneClass: Record<MetaInlineItemTone, string> = {
  default: '',
  success: 'text-success-soft-foreground',
  muted: 'text-muted-foreground',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { VisuallyHidden } from '../../../foundation/primitives';
import { cn } from '../../../foundation/styles';

/**
 * Renders one item of a meta line behind its icon — an event's dates, a post's age — with an optional fuller phrase
 * for screen readers and a tone. It keeps one line: in a narrow row the text cuts with an ellipsis and the icon stays.
 */
defineOptions({ name: 'MetaInlineItem', inheritAttrs: false });

defineSlots<{
  /** The leading icon; decorative, so it is hidden from assistive technology. */
  icon?(): unknown;
  /** The visible text, hidden from assistive technology when `label` is set. */
  default?(): unknown;
}>();

const props = withDefaults(defineProps<MetaInlineItemProps>(), { label: undefined, tone: 'default' });

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const classes = computed(() =>
  cn('inline-flex min-w-0 max-w-full items-center gap-1', ToneClass[props.tone], attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" :data-tone="props.tone" v-bind="rest" :class="classes">
    <span v-if="$slots.icon" class="inline-flex shrink-0" aria-hidden="true"><slot name="icon" /></span>
    <span class="min-w-0 truncate" :aria-hidden="props.label ? 'true' : undefined"><slot /></span>
    <VisuallyHidden v-if="props.label">{{ props.label }}</VisuallyHidden>
  </span>
</template>
