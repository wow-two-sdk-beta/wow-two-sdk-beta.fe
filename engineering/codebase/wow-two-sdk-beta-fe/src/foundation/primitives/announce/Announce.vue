<script lang="ts">
import type { HTMLAttributes } from 'vue';

/** Defines the urgency of an ARIA live-region announcement. */
export const Politeness = {
  /** Refers to a non-urgent announcement — `role="status"`, waits for idle. */
  Polite: 'polite',
  /** Refers to an urgent announcement — `role="alert"`, interrupts. */
  Assertive: 'assertive',
} as const;

export type Politeness = (typeof Politeness)[keyof typeof Politeness];

export interface AnnounceProps extends /* @vue-ignore */ HTMLAttributes {
  /** The live-region urgency — `polite` → `role="status"`, `assertive` → `role="alert"`. Default `polite`. */
  readonly politeness?: Politeness;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '../../styles/Cn';

/**
 * Renders a visually-hidden ARIA live region wrapping the slot, so screen readers announce its content
 * whenever it changes. Pair with a stable mount + swappable content for
 * lightweight transient announcements (status updates, toast messages, etc.).
 */
defineOptions({ name: 'Announce', inheritAttrs: false });

const props = withDefaults(defineProps<{ politeness?: Politeness }>(), {
  politeness: Politeness.Polite,
});

defineSlots<{
  /** The live-region content, announced whenever it changes. */
  default(): unknown;
}>();

const attrs = useAttrs();
const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: '0',
} as const;

const classes = computed(() =>
  cn(
    'absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
    'm-[-1px] [clip:rect(0_0_0_0)] [clip-path:inset(50%)]',
    attrs.class as string | undefined,
  ),
);

const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});
</script>

<template>
  <div
    v-bind="rest"
    :role="props.politeness === Politeness.Assertive ? 'alert' : 'status'"
    :aria-live="props.politeness"
    aria-atomic="true"
    :class="classes"
    :style="[attrs.style, visuallyHiddenStyle]"
  >
    <slot />
  </div>
</template>
