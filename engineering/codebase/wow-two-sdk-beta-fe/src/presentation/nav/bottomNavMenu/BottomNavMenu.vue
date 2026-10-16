<script lang="ts">
/** Defines props for the mobile bottom navigation bar. */
export interface BottomNavMenuProps {
  /** Whether the bar pins to the bottom of the viewport. Default `true`; `false` keeps it in flow. */
  readonly isFixed?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';

/**
 * Renders the mobile bottom navigation bar — three to five top-level destinations as equal-width tabs, padded
 * clear of the device's home indicator.
 */
defineOptions({ name: 'BottomNavMenu', inheritAttrs: false });

/** The `BottomNavMenuItem` destinations. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<BottomNavMenuProps>(), { isFixed: true });

const attrs = useAttrs();
const locale = useLocale();

/** The landmark name — the caller's `aria-label`, else the localized default. */
const landmarkName = computed(
  () => (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('BottomNavMenu.label', undefined, 'Primary'),
);

const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _label, ...others } = attrs;
  return others;
});

const classes = computed(() =>
  cn(
    'border-t border-border bg-background pb-[env(safe-area-inset-bottom)]',
    props.isFixed && 'fixed inset-x-0 bottom-0 z-sticky',
    attrs.class as ClassValue,
  ),
);
</script>

<template>
  <nav v-bind="rest" :aria-label="landmarkName" :class="classes">
    <ul role="list" class="mx-auto grid max-w-lg auto-cols-fr grid-flow-col">
      <slot />
    </ul>
  </nav>
</template>
