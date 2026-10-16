<script lang="ts">
/**
 * The prop surface of `NavigationMenuLink`.
 *
 * React declared `extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here and `children` is the default
 * slot, which leaves no declared prop.
 */
export type NavigationMenuLinkProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs } from 'vue';
import { cn } from '../../../foundation/styles';
import { useRovingFocusItem } from '../../../foundation/primitives';

/** Renders a plain link that joins the strip's roving tab stop. */
defineOptions({ name: 'NavigationMenuLink', inheritAttrs: false });

/** The link content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();

// Reactive object: read its members, never destructure them.
const roving = useRovingFocusItem();

const el = shallowRef<HTMLAnchorElement | null>(null);

function setRef(node: unknown): void {
  el.value = (node ?? null) as HTMLAnchorElement | null;
  roving.ref(node);
}

function handleFocus(): void {
  roving.onFocus();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  roving.onKeydown(event);
}

const classes = computed(() =>
  cn(
    'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
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
  <a
    :tabindex="roving.tabindex"
    :data-roving-focus-item="true"
    v-bind="rest"
    :ref="setRef"
    :class="classes"
    @focus="handleFocus"
    @keydown="handleKeydown"
  >
    <slot />
  </a>
</template>
