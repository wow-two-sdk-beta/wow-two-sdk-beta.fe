<script lang="ts">
import type { HTMLAttributes } from 'vue';

export type KbdTextProps = HTMLAttributes;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders one keyboard key as a `<kbd>` with a subtle border and inset shadow.
 *
 * One key per `KbdText`; chain via `<KbdText>⌘</KbdText> + <KbdText>K</KbdText>`.
 */
defineOptions({ name: 'KbdText', inheritAttrs: false });

/** The key glyph — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn(
    'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border',
    'bg-muted px-1.5 font-mono text-xs text-muted-foreground shadow-[inset_0_-1px_0_0_rgb(0_0_0/0.05)]',
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
  <kbd ref="el" v-bind="rest" :class="classes"><slot /></kbd>
</template>
