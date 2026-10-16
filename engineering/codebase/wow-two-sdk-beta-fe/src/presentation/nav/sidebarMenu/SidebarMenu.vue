<script lang="ts">
/** Defines props for the vertical app sidebar menu. */
export interface SidebarMenuProps {
  /** Whether the menu shows as an icon rail — labels stay for assistive tech only. */
  readonly isCollapsed?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute, dataAttr } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';
import { SidebarMenuKey } from './SidebarMenuContext';

/**
 * Renders the app's vertical sidebar navigation — destinations, labelled sections and collapsible groups,
 * with an icon-rail mode.
 */
defineOptions({ name: 'SidebarMenu', inheritAttrs: false });

/** The `SidebarMenuItem`, `SidebarMenuGroup` and `SidebarMenuSection` parts. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<SidebarMenuProps>(), { isCollapsed: false });

const attrs = useAttrs();
const locale = useLocale();

provide(SidebarMenuKey, {
  get isCollapsed() {
    return props.isCollapsed;
  },
});

/** The landmark name — the caller's `aria-label`, else the localized default. */
const landmarkName = computed(
  () => (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('SidebarMenu.label', undefined, 'Sidebar'),
);

const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _label, ...others } = attrs;
  return others;
});

const classes = computed(() => cn('flex flex-col', attrs.class as ClassValue));
</script>

<template>
  <nav v-bind="rest" :aria-label="landmarkName" :data-collapsed="dataAttr(props.isCollapsed)" :class="classes">
    <ul role="list" class="flex flex-col gap-0.5">
      <slot />
    </ul>
  </nav>
</template>
