<script lang="ts">
export interface TabsGroupPanelProps {
  /** The value this panel belongs to — pairs it with the `TabsGroupTab` of the same value. */
  readonly value: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useTabsContext } from './TabsGroupContext';

/**
 * Renders the panel of one tab, mounted only while that tab is active.
 *
 * Per APG there is no `Presence` exit — the outgoing panel just unmounts and the incoming one is a fresh mount, so
 * the fade-in replays. React forced that with `key={ctx.value}`.
 */
defineOptions({ name: 'TabsGroupPanel', inheritAttrs: false });

/** The panel content — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<TabsGroupPanelProps>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const tabs = useTabsContext();

const isActive = computed(() => tabs.value === props.value);

const tabId = computed(() => `${tabs.baseId}-tab-${props.value}`);
const panelId = computed(() => `${tabs.baseId}-panel-${props.value}`);

const classes = computed(() =>
  cn(
    'flex-1 outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    'motion-safe:animate-(--animate-fade-in)',
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
  <div
    v-if="isActive"
    ref="el"
    v-bind="rest"
    :id="panelId"
    role="tabpanel"
    :aria-labelledby="tabId"
    :tabindex="0"
    :class="classes"
  >
    <slot />
  </div>
</template>
