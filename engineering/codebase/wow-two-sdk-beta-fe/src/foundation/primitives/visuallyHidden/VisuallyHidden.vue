<script lang="ts">
import type { HTMLAttributes } from 'vue';

export type VisuallyHiddenProps = HTMLAttributes;
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '../../styles/Cn';

/**
 * Renders the slot in a visually hidden span — content removed from the visual
 * layout but still announced to screen readers. Use for accessible labels on
 * icon-only affordances and live-region announcements.
 *
 * `inheritAttrs: false` so a caller's `class` goes through `cn` (tailwind-merge
 * resolves the conflict) instead of being blindly concatenated by Vue's
 * automatic class fallthrough — a caller's `p-2` must be able to beat `p-0`.
 */
defineOptions({ name: 'VisuallyHidden', inheritAttrs: false });

defineSlots<{
  /** The content announced to screen readers but hidden from view. */
  default(): unknown;
}>();

const attrs = useAttrs();

const classes = computed(() =>
  cn(
    'absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
    'm-[-1px] [clip:rect(0_0_0_0)] [clip-path:inset(50%)]',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <span v-bind="rest" :class="classes"><slot /></span>
</template>
