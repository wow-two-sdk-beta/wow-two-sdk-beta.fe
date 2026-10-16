<script lang="ts">
import type { CornerPosition } from '../../../foundation/styles';

/** Defines the NotificationIndicator color tone. */
export const NotificationIndicatorTone = {
  /** Refers to the destructive / error color. */
  Destructive: 'destructive',
  /** Refers to the positive / confirmation color. */
  Success: 'success',
  /** Refers to the caution color. */
  Warning: 'warning',
  /** Refers to the informational color. */
  Info: 'info',
  /** Refers to the primary brand color. */
  Primary: 'primary',
  /** Refers to the neutral color. */
  Neutral: 'neutral',
} as const;

export type NotificationIndicatorTone = (typeof NotificationIndicatorTone)[keyof typeof NotificationIndicatorTone];

/** Defines the NotificationIndicator size step. */
export const NotificationIndicatorSize = {
  /** Refers to the extra-small dot. */
  Xs: 'xs',
  /** Refers to the small dot. */
  Sm: 'sm',
  /** Refers to the medium dot. */
  Md: 'md',
} as const;

export type NotificationIndicatorSize = (typeof NotificationIndicatorSize)[keyof typeof NotificationIndicatorSize];

export interface NotificationIndicatorProps {
  /** The color tone. Default `destructive`. */
  readonly tone?: NotificationIndicatorTone;

  /** The size step. Default `sm`. */
  readonly size?: NotificationIndicatorSize;

  /** The pulsing ring around the dot. */
  readonly hasPulse?: boolean;

  /** The corner position — when set, the dot is positioned absolutely relative to its parent. */
  readonly position?: CornerPosition;
}

const ToneClass: Record<NotificationIndicatorTone, string> = {
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  primary: 'bg-primary',
  neutral: 'bg-muted-foreground',
};

/* Static literal map — Tailwind must see the complete `after:bg-*` class names. */
const PulseTone: Record<NotificationIndicatorTone, string> = {
  destructive: 'after:bg-destructive',
  success: 'after:bg-success',
  warning: 'after:bg-warning',
  info: 'after:bg-info',
  primary: 'after:bg-primary',
  neutral: 'after:bg-muted-foreground',
};

const SizeClass: Record<NotificationIndicatorSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

const PositionClass: Record<CornerPosition, string> = {
  'top-right': 'absolute -top-0.5 -right-0.5',
  'top-left': 'absolute -top-0.5 -left-0.5',
  'bottom-right': 'absolute -bottom-0.5 -right-0.5',
  'bottom-left': 'absolute -bottom-0.5 -left-0.5',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a tiny coloured unread dot, absolutely placed over its parent when given `position`.
 *
 * Pin it on an `Avatar` or a square / circle `Button`.
 */
defineOptions({ name: 'NotificationIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<NotificationIndicatorProps>(), {
  tone: 'destructive',
  size: 'sm',
  hasPulse: undefined,
  position: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const classes = computed(() =>
  cn(
    'inline-flex rounded-full ring-2 ring-background',
    ToneClass[props.tone],
    SizeClass[props.size],
    /* `relative` anchors the ::after ring; PositionClass comes later so its `absolute` wins when positioned. */
    props.hasPulse &&
      `relative after:absolute after:inset-0 after:animate-ping after:rounded-full after:opacity-75 after:content-[""] ${PulseTone[props.tone]}`,
    props.position && PositionClass[props.position],
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
  <span ref="el" aria-hidden="true" v-bind="rest" :class="classes" />
</template>
