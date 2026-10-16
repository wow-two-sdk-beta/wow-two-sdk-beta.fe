<script lang="ts">
/** Defines props for a row that shows the first items and counts the rest. */
export interface OverflowGroupProps<T> {
  /** Every item; the first `max` render and the rest collapse into the overflow marker. */
  readonly items: ReadonlyArray<T>;

  /** The most items shown before the overflow marker. Default 3; rounded, at least 0. */
  readonly max?: number;

  /** Stable identity per item. Default the index. */
  readonly getKey?: (item: T, index: number) => string | number;

  /** The overflow marker text; `{count}` becomes the hidden count. Default `"+{count}"`, localized. */
  readonly overflowLabel?: string;
}

/** @internal The visible count used when `max` is not a finite number. */
const DefaultMax = 3;
</script>

<script setup lang="ts" generic="T">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';

/**
 * Renders the first items of a list in one row and a single marker counting the rest — tag lists, assignee
 * rows and chip filters that must not wrap.
 */
defineOptions({ name: 'OverflowGroup', inheritAttrs: false });

defineSlots<{
  /** One visible item. */
  default(props: { item: T; index: number }): unknown;

  /** Replaces the overflow marker; receives the hidden items and their count. */
  overflow?(props: { hidden: ReadonlyArray<T>; count: number }): unknown;
}>();

const props = withDefaults(defineProps<OverflowGroupProps<T>>(), {
  max: DefaultMax,
  getKey: undefined,
  overflowLabel: undefined,
});

const attrs = useAttrs();
const locale = useLocale();

const visibleCount = computed(() => Math.max(0, Math.round(Number.isFinite(props.max) ? props.max : DefaultMax)));
const visible = computed(() => props.items.slice(0, visibleCount.value));
const hidden = computed(() => props.items.slice(visibleCount.value));

/** The marker text for the hidden count. */
const markerText = computed(() =>
  props.overflowLabel === undefined
    ? locale.t('OverflowGroup.overflowLabel', { count: hidden.value.length }, '+{count}')
    : props.overflowLabel.replaceAll('{count}', String(hidden.value.length)),
);

/** The marker's accessible name, which says what the number counts. */
const markerName = computed(() =>
  locale.t('OverflowGroup.hiddenItems', { count: hidden.value.length }, '{count} more'),
);

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const classes = computed(() => cn('flex flex-nowrap items-center gap-1.5 overflow-hidden', attrs.class as ClassValue));

/** Resolves an item's key. */
function keyOf(item: T, index: number): string | number {
  return props.getKey ? props.getKey(item, index) : index;
}
</script>

<template>
  <div v-bind="rest" :class="classes">
    <template v-for="(item, index) in visible" :key="keyOf(item, index)">
      <slot :item="item" :index="index" />
    </template>
    <template v-if="hidden.length > 0">
      <slot name="overflow" :hidden="hidden" :count="hidden.length">
        <span
          class="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          :aria-label="markerName"
          data-overflow-marker
        >
          {{ markerText }}
        </span>
      </slot>
    </template>
  </div>
</template>
