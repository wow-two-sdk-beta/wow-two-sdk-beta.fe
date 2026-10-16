<script lang="ts">
import type { AnchorHTMLAttributes } from 'vue';
import type { LinkItemVariants, LinkItemVariant, LinkItemSize } from './LinkItem.variants';

/* Both heritage types are `@vue-ignore`d — native anchor attributes belong in attribute
   fallthrough, and `LinkItemVariants` resolves through `typeof linkVariants`, which the SFC prop
   compiler cannot walk. The type surface is unchanged. */
export interface LinkItemProps
  extends /* @vue-ignore */ AnchorHTMLAttributes, /* @vue-ignore */ Omit<LinkItemVariants, 'variant' | 'size'> {
  /** The color treatment. */
  readonly variant?: LinkItemVariant;
  /** The text size. */
  readonly size?: LinkItemSize;
  /** The as-child flag — when true, renders the child element as the link instead of an `<a>`.
   *  Use for a router `<RouterLink>`. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { UrlExtensions } from '../../../foundation/dom';
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { HtmlElement } from '../../../foundation/dom';
import { Primitive } from '../../../foundation/primitives';
import { linkVariants } from './LinkItem.variants';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/* `<link-item>` is a real HTML element, but this is a library component — imported, never globally
   registered — so the name cannot shadow the tag, and renaming it would break parity with the
   React package. `vue/no-reserved-component-names` is off for `src/presentation/**` for exactly
   this reason. */
/** Renders a styled anchor with consistent focus and hover treatment, or lends its styling to a router link. */
defineOptions({ name: 'LinkItem', inheritAttrs: false });

const props = withDefaults(defineProps<LinkItemProps>(), { asChild: false });

defineSlots<{
  /** The link text, or — under `asChild` — the single element that becomes the link. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() => ({
  ...Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
  href: UrlExtensions.safeNavigation(attrs.href),
}));

const rootClass = computed(() =>
  cn(linkVariants({ variant: props.variant, size: props.size }), attrs.class as ClassValue),
);

const root = useTemplateRef<ComponentPublicInstance>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
const el = computed<HTMLElement | null>(() => {
  const node = root.value?.$el;
  return node instanceof HTMLElement ? node : null;
});

defineExpose({ el });
</script>

<template>
  <!-- Anchor with consistent focus/hover styling — `asChild` swaps in router links. -->
  <Primitive ref="root" :as="HtmlElement.Anchor" :as-child="asChild" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </Primitive>
</template>
