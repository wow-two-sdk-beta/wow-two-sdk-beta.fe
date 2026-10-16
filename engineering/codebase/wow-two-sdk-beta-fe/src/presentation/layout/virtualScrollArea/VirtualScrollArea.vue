<script lang="ts">
/** Defines props for the windowed scroll area. */
export interface VirtualScrollAreaProps<T> {
  /** The full item list; only the rows near the viewport render. */
  readonly items: ReadonlyArray<T>;

  /** Each item's size along the scroll axis in px — exact, or the estimate when `hasVariableSize`. */
  readonly itemSize: number | ((index: number) => number);

  /** Whether rendered items are measured, so rows of unknown size settle to their real size. Default `false`. */
  readonly hasVariableSize?: boolean;

  /** Extra items rendered beyond each edge of the viewport. Default 3. */
  readonly overscan?: number;

  /** Whether the area scrolls horizontally instead of vertically. Default `false`. */
  readonly isHorizontal?: boolean;

  /** Stable identity per item, so measurements survive reorders. Default the index. */
  readonly getKey?: (item: T, index: number) => string | number;

  /** How many items before the end the rendered window must reach to report `end-reached`. Default 5. */
  readonly endThreshold?: number;
}
</script>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, useAttrs, useTemplateRef, watch, type CSSProperties } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useVirtualList, type VirtualItem } from '../../../foundation/virtualization';

/**
 * Renders a scroll area that keeps only the rows near its viewport in the DOM, so a list of any length scrolls
 * at the cost of one screen. Size the area through `class` or `style`; it scrolls its own content.
 */
defineOptions({ name: 'VirtualScrollArea', inheritAttrs: false });

defineSlots<{
  /** One rendered item. */
  default(props: { item: T; index: number }): unknown;

  /** The content shown when `items` is empty. */
  empty?(): unknown;
}>();

const props = withDefaults(defineProps<VirtualScrollAreaProps<T>>(), {
  hasVariableSize: false,
  overscan: undefined,
  isHorizontal: false,
  getKey: undefined,
  endThreshold: 5,
});

const emit = defineEmits<{
  /** Fires once per list length when the rendered window reaches within `endThreshold` items of the end. */
  'end-reached': [];
}>();

const attrs = useAttrs();
const viewport = useTemplateRef<HTMLDivElement>('viewport');

const list = useVirtualList({
  count: () => props.items.length,
  estimateSize: (index) => (typeof props.itemSize === 'function' ? props.itemSize(index) : props.itemSize),
  target: viewport,
  overscan: () => props.overscan,
  horizontal: () => props.isHorizontal,
  getItemKey: (index) => (props.getKey ? props.getKey(props.items[index] as T, index) : index),
});

/** @internal The list length that already reported `end-reached`, so each length reports once. */
let reportedLength: number | null = null;

/** @internal The one observer measuring every rendered row, created on mount when sizes vary. */
let observer: ResizeObserver | null = null;

/** @internal The rows the observer currently watches, by element. */
const observedRows = new Map<Element, number>();

const virtualItems = list.virtualItems;

/** The spacer that gives the scrollbar the full list's size. */
const spacerStyle = computed<CSSProperties>(() =>
  props.isHorizontal
    ? { width: `${list.totalSize.value}px`, height: '100%' }
    : { height: `${list.totalSize.value}px`, width: '100%' },
);

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const viewportClass = computed(() => cn('relative overflow-auto', attrs.class as ClassValue));

/** Reports `end-reached` once per length when the rendered window nears the end. */
watch(
  () => [list.range.value.endIndex, props.items.length] as const,
  ([endIndex, length]) => {
    if (length === 0 || endIndex < 0) return;
    const threshold = Math.max(0, Math.round(Number.isFinite(props.endThreshold) ? props.endThreshold : 0));
    if (endIndex < length - 1 - threshold || reportedLength === length) return;
    reportedLength = length;
    emit('end-reached');
  },
  { flush: 'post' },
);

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const index = observedRows.get(entry.target);
      if (index === undefined) continue;
      const box = entry.borderBoxSize?.[0];
      const size = props.isHorizontal
        ? (box?.inlineSize ?? entry.contentRect.width)
        : (box?.blockSize ?? entry.contentRect.height);
      if (size > 0) list.measureItem(index, size);
    }
  });
  for (const row of observedRows.keys()) observer.observe(row);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  observedRows.clear();
});

/** The position of one rendered row along the scroll axis. */
function rowStyle(item: VirtualItem): CSSProperties {
  const offset = props.isHorizontal ? `translateX(${item.start}px)` : `translateY(${item.start}px)`;
  const size = props.hasVariableSize ? undefined : `${item.size}px`;
  return props.isHorizontal
    ? { position: 'absolute', top: 0, left: 0, height: '100%', width: size, transform: offset }
    : { position: 'absolute', top: 0, left: 0, width: '100%', height: size, transform: offset };
}

/** Tracks a rendered row for measurement while sizes vary; releases it when it unmounts. */
function bindRow(node: unknown, index: number): void {
  if (!props.hasVariableSize) return;
  const row = node as Element | null;
  if (!row) return;
  const previous = observedRows.get(row);
  observedRows.set(row, index);
  if (previous === undefined) observer?.observe(row);
}

/** Stops measuring rows that left the window. */
watch(
  virtualItems,
  () => {
    for (const row of [...observedRows.keys()]) {
      if (row.isConnected) continue;
      observer?.unobserve(row);
      observedRows.delete(row);
    }
  },
  { flush: 'post' },
);

defineExpose({ el: viewport, scrollToIndex: list.scrollToIndex });
</script>

<template>
  <div ref="viewport" v-bind="rest" :class="viewportClass" :data-orientation="isHorizontal ? 'horizontal' : 'vertical'">
    <slot v-if="items.length === 0" name="empty" />
    <div v-else class="relative" :style="spacerStyle">
      <div
        v-for="virtual in virtualItems"
        :key="virtual.key"
        :ref="(node) => bindRow(node, virtual.index)"
        :data-index="virtual.index"
        :style="rowStyle(virtual)"
      >
        <slot :item="items[virtual.index] as T" :index="virtual.index" />
      </div>
    </div>
  </div>
</template>
