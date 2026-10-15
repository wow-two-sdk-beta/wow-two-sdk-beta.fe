<script lang="ts">
/**
 * The prop surface of `OverlayCloseButton`.
 *
 * React declared `extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>`;
 * attributes reach the root through `useAttrs` here, so only `asChild` remains.
 */
export interface OverlayCloseButtonProps {
  /** Merge onto the single slot child instead of rendering a `<button>`. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { resolveElement } from '../../foundation/dom';
import { useLocale } from '../../foundation/i18n';
import { computed, useAttrs, useSlots, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { X } from 'lucide-vue-next';
import { cn } from '../../foundation/styles';
import { Primitive } from '../../foundation/primitives';
import { useOverlayChromeContext } from './OverlayChrome';

const locale = useLocale();

/** Renders the dismiss control of a Modal / Drawer panel; it closes the overlay and restores focus. */
defineOptions({ name: 'OverlayCloseButton', inheritAttrs: false });

/** The button content — React's `children`. Falls back to an `X` glyph. */
defineSlots<{ default?(): unknown }>();

const props = withDefaults(defineProps<OverlayCloseButtonProps>(), { asChild: false });

const attrs = useAttrs();
const slots = useSlots();
const context = useOverlayChromeContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/** `asChild` hands styling to the caller's element — React applied `className` bare in that branch. */
const classes = computed(() =>
  props.asChild
    ? (attrs.class as string | undefined)
    : cn(
        'absolute right-4 top-[calc(1rem+var(--ui-overlay-inset-top,0px))] grid h-7 w-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        attrs.class as string | undefined,
      ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/**
 * `@click` is declared after `v-bind="rest"`, so Vue chains the caller's own
 * handler first and this one second — the order React's `onClick?.(e)` had, and
 * what makes the `defaultPrevented` opt-out below work.
 */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  context.close();
}

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <Primitive
    ref="inner"
    as="button"
    :as-child="props.asChild"
    type="button"
    :aria-label="slots.default ? undefined : locale.t('OverlayCloseButton.close', undefined, 'Close')"
    v-bind="rest"
    :class="classes"
    @click="handleClick"
  >
    <slot><X class="h-4 w-4" /></slot>
  </Primitive>
</template>
