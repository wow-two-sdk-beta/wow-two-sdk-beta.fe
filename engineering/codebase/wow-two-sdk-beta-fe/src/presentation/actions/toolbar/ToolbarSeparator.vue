<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Orientation } from '../../../foundation/styles';
import { useToolbarContext } from './ToolbarContext';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a hairline rule between two toolbar groups, turned across the toolbar's own axis. */
defineOptions({ name: 'ToolbarSeparator', inheritAttrs: false });

const attrs = useAttrs();
const context = useToolbarContext();

const isVertical = computed(() => context.orientation === Orientation.Vertical);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn('shrink-0 bg-border', isVertical.value ? 'mx-1 h-px' : 'my-1 w-px self-stretch', attrs.class as ClassValue),
);
</script>

<template>
  <div
    role="separator"
    :aria-orientation="isVertical ? 'horizontal' : 'vertical'"
    :class="rootClass"
    v-bind="passthroughAttrs"
  />
</template>
