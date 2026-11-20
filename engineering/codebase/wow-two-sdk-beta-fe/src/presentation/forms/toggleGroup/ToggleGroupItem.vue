<script lang="ts">
import type { IconAdapter } from '../../../foundation/icons';
import type { ToggleInputProps } from '../toggleInput';

/* Every `ToggleInput` prop other than the ones declared below flows to the inner `ToggleInput` through attribute
   fallthrough, so the heritage is `@vue-ignore`d: the SFC prop compiler cannot walk it. */
/** Defines props for one toggle button of a `ToggleGroup`, with an optional icon and count. */
export interface ToggleGroupItemProps extends /* @vue-ignore */ Omit<ToggleInputProps, 'value'> {
  /** The identity keying this item in the group's selection. */
  readonly value: string;

  /** The item's text. With a `count` it also names the item for assistive technology: `"Conference 12"`. */
  readonly label?: string;

  /** The tally after the label, in a muted tabular figure. The default slot replaces the label, not the tally. */
  readonly count?: number;

  /** The icon before the label — a `lucide-vue-next` icon or any component of that shape. */
  readonly icon?: IconAdapter;

  /** The icon's pixel size. Default 15. */
  readonly iconSize?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale, useLocaleFormatters } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import ToggleInput from '../toggleInput/ToggleInput.vue';

/**
 * Renders one toggle button of a `ToggleGroup` — a label with an optional leading icon and a trailing count, for
 * facet and filter chips.
 */
/* `inheritAttrs: false` so the attrs reach the inner `ToggleInput` by hand, `aria-label` aside: it is rebuilt below
   to carry the count. */
defineOptions({ name: 'ToggleGroupItem', inheritAttrs: false });

const props = withDefaults(defineProps<ToggleGroupItemProps>(), {
  label: undefined,
  count: undefined,
  icon: undefined,
  iconSize: 15,
});

defineSlots<{
  /** The label content, richer than the `label` prop it falls back to; receives `{ pressed }`. */
  default?(props: { pressed: boolean }): unknown;
}>();

const attrs = useAttrs();
const locale = useLocale();
const formatters = useLocaleFormatters();

/** The count as the reader's locale writes it (`1,200` / `1 200`). */
const countText = computed(() => (props.count === undefined ? undefined : formatters.value.number(props.count)));

type PressedName = (args: { pressed: boolean }) => string;

/** Appends the count to a name: `"Conference"` → `"Conference 12"`, ordered by the locale's message. */
function withCount(name: string | undefined): string | undefined {
  if (name === undefined || countText.value === undefined) return name;
  return locale.t('ToggleGroupItem.countedName', { label: name, count: countText.value }, '{label} {count}');
}

/** The accessible name: the consumer's `aria-label`, else the `label`, either followed by the count. */
const accessibleName = computed<string | PressedName | undefined>(() => {
  const named = (attrs[AriaAttribute.Label] as string | PressedName | undefined) ?? props.label;
  if (typeof named === 'function') return (args) => withCount(named(args)) ?? '';
  return withCount(named);
});

const forwarded = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== AriaAttribute.Label)),
);
</script>

<template>
  <ToggleInput v-bind="forwarded" :value="value" :aria-label="accessibleName">
    <template #default="{ pressed }">
      <Icon v-if="icon" :icon="icon" :size="iconSize" />
      <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
        <slot :pressed="pressed">{{ label }}</slot>
        <span v-if="countText !== undefined" data-toggle-count class="tabular-nums opacity-70">{{ countText }}</span>
      </span>
    </template>
  </ToggleInput>
</template>
