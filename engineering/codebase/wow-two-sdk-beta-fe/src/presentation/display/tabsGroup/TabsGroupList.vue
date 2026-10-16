<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `TabsGroupListProps` and consumers import it. Its only
   member was `children`, which is the default slot here; every attribute falls through. */
export interface TabsGroupListProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, Orientation } from '../../../foundation/styles';
import { RovingFocusGroup, type ComponentElement } from '../../../foundation/primitives';
import { useTabsContext } from './TabsGroupContext';

/** Renders the tablist strip, taking arrow-key navigation from `RovingFocusGroup`. */
defineOptions({ name: 'TabsGroupList', inheritAttrs: false });

/** The `TabsGroupTab` children — React's required `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<ComponentElement>('el');
const tabs = useTabsContext();

const classes = computed(() =>
  cn(
    'inline-flex border-border',
    tabs.orientation === Orientation.Vertical ? 'flex-col border-r' : 'flex-row border-b',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Exposes the child's documented DOM handle, never its component instance. */
const rootElement = computed<HTMLElement | null>(() => {
  const node = el.value?.el;
  const elementType = node?.ownerDocument.defaultView?.HTMLElement;
  return elementType && node instanceof elementType ? node : null;
});

defineExpose({ el: rootElement });
</script>

<template>
  <RovingFocusGroup
    ref="el"
    :orientation="tabs.orientation"
    can-loop
    role="tablist"
    :aria-orientation="tabs.orientation"
    :data-orientation="tabs.orientation"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </RovingFocusGroup>
</template>
