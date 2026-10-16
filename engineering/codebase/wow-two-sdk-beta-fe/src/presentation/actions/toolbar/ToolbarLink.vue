<script lang="ts">
import type { AnchorHTMLAttributes } from 'vue';

/* Native anchor attributes stay in attribute fallthrough rather than becoming runtime props. */
export type ToolbarLinkProps = /* @vue-ignore */ Omit<AnchorHTMLAttributes, 'children'>;
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useRovingFocusItem } from '../../../foundation/primitives';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders one anchor inside a toolbar, taking its turn in the group's roving tab stop. */
defineOptions({ name: 'ToolbarLink', inheritAttrs: false });

defineSlots<{
  /** The anchor's own label. */
  default(): unknown;
}>();

const attrs = useAttrs();

/* Reactive object — `tabindex` tracks the group's tab stop, so read through it rather than
   destructuring. The function `ref` registers this item's node with the group. */
const roving = useRovingFocusItem();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex h-8 items-center justify-center rounded-sm px-2 text-sm text-foreground underline-offset-2 transition-colors hover:bg-muted hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as ClassValue,
  ),
);

/* Chained after the consumer's own keydown (attribute fallthrough puts theirs first) and skipped
   when they called `preventDefault()` — the original's explicit `if (e.defaultPrevented) return`. */
function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  roving.onKeydown(event);
}
</script>

<template>
  <a
    :ref="roving.ref"
    :tabindex="roving.tabindex"
    :data-roving-focus-item="roving['data-roving-focus-item']"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @focus="roving.onFocus()"
    @keydown="handleKeydown"
  >
    <slot />
  </a>
</template>
