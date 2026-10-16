<script lang="ts">
/** Defines the AnnotationBadge highlight tone. */
export const AnnotationTone = {
  /** Refers to an informational note. */
  Note: 'note',
  /** Refers to a comment. */
  Comment: 'comment',
  /** Refers to a suggestion. */
  Suggestion: 'suggestion',
  /** Refers to a flagged issue. */
  Issue: 'issue',
  /** Refers to a resolved annotation. */
  Resolved: 'resolved',
} as const;

export type AnnotationTone = (typeof AnnotationTone)[keyof typeof AnnotationTone];

export interface AnnotationBadgeProps {
  /** The numeric badge / index shown in the pin. Rich content → the `index` slot. */
  readonly index?: number | string;

  /** The tone — drives the highlight color. */
  readonly tone?: AnnotationTone;

  /** The pin-only mode — a small floating pin without underline. */
  readonly isPinOnly?: boolean;

  /** The resolved state (dimmed, struck-through highlight). */
  readonly isResolved?: boolean;

  /** The active state — the currently focused / hovered annotation. */
  readonly isActive?: boolean;
}

const ToneHighlight: Record<AnnotationTone, string> = {
  note: 'bg-info-soft/60 decoration-info',
  comment: 'bg-primary-soft/60 decoration-primary',
  suggestion: 'bg-success-soft/60 decoration-success',
  issue: 'bg-destructive-soft/60 decoration-destructive',
  resolved: 'bg-muted decoration-muted-foreground',
};

const TonePin: Record<AnnotationTone, string> = {
  note: 'bg-info text-info-foreground',
  comment: 'bg-primary text-primary-foreground',
  suggestion: 'bg-success text-success-foreground',
  issue: 'bg-destructive text-destructive-foreground',
  resolved: 'bg-muted-foreground text-background',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a focusable annotation marker around content, or a bare numbered chip with `isPinOnly`.
 *
 * Click fires the open-thread flow. Pin-only suits margin markers or floating layers (position via `class`).
 */
defineOptions({ name: 'AnnotationBadge', inheritAttrs: false });

defineSlots<{
  /** The wrapped text or content the annotation refers to. Omit for a standalone pin. */
  default?(): unknown;
  /** The rich override for the pin's badge — replaces the `index` prop. */
  index?(): unknown;
}>();

const props = withDefaults(defineProps<AnnotationBadgeProps>(), { tone: 'comment' });

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLButtonElement>('el');

const effectiveTone = computed<AnnotationTone>(() => (props.isResolved ? 'resolved' : props.tone));

/** React branched on `isPinOnly || children == null`; the default slot is Vue's `children`. */
const isPin = computed(() => Boolean(props.isPinOnly) || !slots.default);

const pinClasses = computed(() =>
  cn(
    'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
    TonePin[effectiveTone.value],
  ),
);

const classes = computed(() =>
  isPin.value
    ? cn(
        'inline-flex items-center gap-1 align-middle rounded-full ring-1 ring-transparent transition-shadow',
        props.isActive && 'ring-ring',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        attrs.class as string | undefined,
      )
    : cn(
        'group inline-flex items-baseline gap-1 align-baseline rounded-sm px-0.5 transition-colors',
        'underline decoration-2 underline-offset-4',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        ToneHighlight[effectiveTone.value],
        props.isResolved && 'line-through opacity-70',
        props.isActive && 'ring-1 ring-ring',
        attrs.class as string | undefined,
      ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <button
    ref="el"
    type="button"
    :data-tone="effectiveTone"
    :data-active="props.isActive ? '' : undefined"
    v-bind="rest"
    :class="classes"
  >
    <span v-if="!isPin"><slot /></span>
    <span aria-hidden="true" :class="pinClasses"
      ><slot name="index">{{ props.index ?? '' }}</slot></span
    >
  </button>
</template>
