<script lang="ts">
/* `CornerPosition` is imported here (not in `<script setup>`) so the one binding serves
   as both the type below and the runtime value used in `withDefaults`. */
import { CornerPosition } from '../../../foundation/styles';

export interface BadgeOverlayProps {
  /** The position of the badge relative to the wrapper. Default `top-right`. */
  readonly position?: CornerPosition;

  /** The hidden state — hides the badge when truthy (e.g. when count is 0). */
  readonly isHidden?: boolean;
}

const PositionClass: Record<NonNullable<BadgeOverlayProps['position']>, string> = {
  'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
  'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
  'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a badge, dot, or icon pinned to a corner of whatever child it wraps.
 *
 * Attaches `CountBadge`, `NotificationIndicator`, or a `Badge` to an `Avatar`, an icon, or a square / circle `Button`.
 */
defineOptions({ name: 'BadgeOverlay', inheritAttrs: false });

/** Both of React's required `ReactNode` props are structural, so both become slots. */
defineSlots<{
  /** The element to overlay on (avatar, button, image). */
  default(): unknown;

  /** The badge content (count, dot, icon). */
  badge(): unknown;
}>();

const props = withDefaults(defineProps<BadgeOverlayProps>(), {
  position: CornerPosition.TopRight,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const classes = computed(() => cn('relative inline-flex', attrs.class as string | undefined));

const badgeClasses = computed(() => cn('absolute z-raised', PositionClass[props.position]));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <slot />
    <span v-if="!props.isHidden" :class="badgeClasses"><slot name="badge" /></span>
  </div>
</template>
