<script lang="ts">
import type { HTMLAttributes } from 'vue';
import type { Orientation } from '../../../foundation/styles';

/* Native div attributes stay in attribute fallthrough rather than becoming runtime props. */
export interface ToolbarProps extends /* @vue-ignore */ HTMLAttributes {
  /** The layout axis — drives both the arrow-key navigation and the flex direction. Default `horizontal`. */
  readonly orientation?: Orientation;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Orientation as OrientationValue } from '../../../foundation/styles';
import { RovingFocusGroup } from '../../../foundation/primitives';
import { ToolbarKey } from './ToolbarContext';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a bordered strip of actions that arrow keys walk through as a single tab stop. */
defineOptions({ name: 'Toolbar', inheritAttrs: false });

const props = withDefaults(defineProps<ToolbarProps>(), {
  orientation: OrientationValue.Horizontal,
});

defineSlots<{
  /** The toolbar items — buttons, links, and separators sharing one roving tab stop. */
  default(): unknown;
}>();

const attrs = useAttrs();

/* Live getter, not a snapshot — `ToolbarSeparator` re-reads it to flip its own axis. */
provide(ToolbarKey, {
  get orientation() {
    return props.orientation;
  },
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex items-center gap-1 rounded-md border border-border bg-background p-1',
    props.orientation === OrientationValue.Vertical && 'flex-col items-stretch',
    attrs.class as ClassValue,
  ),
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
  <RovingFocusGroup
    ref="root"
    :orientation="orientation"
    can-loop
    role="toolbar"
    :aria-orientation="orientation"
    :data-orientation="orientation"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <slot />
  </RovingFocusGroup>
</template>
