<script lang="ts">
export interface CollapsibleGroupContentProps {
  /** The force-mounted mode — renders hidden content but keeps it in the DOM (for animations). */
  readonly isForceMounted?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { Presence } from '../../../foundation/primitives';
import { useCollapsibleContext } from './CollapsibleGroupContext';
import CollapsibleGroupContentInner from './CollapsibleGroupContentInner.vue';

/**
 * Renders the disclosure pane, kept mounted by `Presence` until its close animation ends.
 *
 * Force-mounted it renders straight through with an explicit `data-state`; otherwise `Presence` supplies `data-state`
 * itself.
 */
defineOptions({ name: 'CollapsibleGroupContent', inheritAttrs: false });

/** The pane content — React's required `children`. */
defineSlots<{ default(): unknown }>();

/* Not bound to a `props` const: with every reference now in the template — where the bare
   name compiles to `$props`, which survives a setup throw — the binding would be unused. */
withDefaults(defineProps<CollapsibleGroupContentProps>(), {
  isForceMounted: undefined,
});

const context = useCollapsibleContext();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/** The rendered pane — the Vue stand-in for the React original's forwarded ref. */
const el = computed<HTMLElement | null>(() => (inner.value?.$el instanceof HTMLElement ? inner.value.$el : null));

defineExpose({ el });
</script>

<template>
  <CollapsibleGroupContentInner
    v-if="isForceMounted"
    ref="inner"
    :is-force-mounted="isForceMounted"
    :data-state="context.open ? 'open' : 'closed'"
    v-bind="$attrs"
  >
    <slot />
  </CollapsibleGroupContentInner>
  <Presence v-else :is-present="context.open">
    <CollapsibleGroupContentInner ref="inner" :is-force-mounted="isForceMounted" v-bind="$attrs">
      <slot />
    </CollapsibleGroupContentInner>
  </Presence>
</template>
