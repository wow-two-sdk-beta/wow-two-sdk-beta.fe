<script lang="ts">
import type { ButtonHTMLAttributes } from 'vue';

/* Native button attributes stay in attribute fallthrough rather than becoming runtime props. */
export interface ToolbarButtonProps extends /* @vue-ignore */ Omit<ButtonHTMLAttributes, 'children'> {
  /** The as-child flag — renders as the single child via `Primitive`, dropping item chrome. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { ButtonType, HtmlElement } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { Primitive, useRovingFocusItem } from '../../../foundation/primitives';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders one action button inside a toolbar, taking its turn in the group's roving tab stop. */
defineOptions({ name: 'ToolbarButton', inheritAttrs: false });

const props = withDefaults(defineProps<ToolbarButtonProps>(), { asChild: false });

defineSlots<{
  /** The button's label, or — under `asChild` — the single element that becomes the item. */
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
  props.asChild
    ? cn(attrs.class as ClassValue)
    : cn(
        'inline-flex h-8 items-center justify-center rounded-sm px-2 text-sm transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
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
  <Primitive
    :ref="roving.ref"
    :as="HtmlElement.Button"
    :as-child="asChild"
    :type="asChild ? undefined : ButtonType.Button"
    :tabindex="roving.tabindex"
    :data-roving-focus-item="roving['data-roving-focus-item']"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @focus="roving.onFocus()"
    @keydown="handleKeydown"
  >
    <slot />
  </Primitive>
</template>
