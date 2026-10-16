<script lang="ts">
import { inject, type InjectionKey } from 'vue';
/* `Orientation` is imported as a value so the one binding serves as both the
   type below and the runtime default in `withDefaults`. */
import { Orientation } from '../../../foundation/styles';

/** The size constraints a `ResizablePanel` contributes to its group. */
export interface PanelInfo {
  defaultSize: number;
  minSize: number;
  maxSize: number;
}

/**
 * The group context. Every member is a live getter or a method — read them,
 * never destructure, or the reactivity is lost at the point of the snapshot.
 */
export interface ResizableContextValue {
  readonly orientation: Orientation;
  readonly sizes: ReadonlyArray<number>;
  readonly panels: ReadonlyArray<PanelInfo>;

  /**
   * Registration replaces React's `Children.map` index threading: a Vue parent
   * cannot rewrite its slot's children, so each child claims its own slot with an
   * identity token. Order is *registration* order — the same model the house
   * `createCollection` primitive uses — which equals document order for mount,
   * append, and remove.
   */
  registerPanel: (token: symbol, info: PanelInfo) => void;
  updatePanel: (token: symbol, info: PanelInfo) => void;
  unregisterPanel: (token: symbol) => void;
  panelIndex: (token: symbol) => number;

  registerSeparator: (token: symbol) => void;
  unregisterSeparator: (token: symbol) => void;
  separatorIndex: (token: symbol) => number;

  beginDrag: (separatorIndex: number, event: MouseEvent) => boolean;
  nudge: (separatorIndex: number, deltaPct: number) => void;
  resetPair: (separatorIndex: number) => void;
}

export const resizableContextKey: InjectionKey<ResizableContextValue> = Symbol('wow-two.resizablePanels');

export function useResizableContext(): ResizableContextValue {
  const context = inject(resizableContextKey, null);
  if (!context) throw new Error('ResizablePanelsLayout.* must be used inside <ResizablePanelsLayout>');
  return context;
}

export interface ResizablePanelsLayoutProps {
  /** The split axis — `horizontal` (side-by-side panels) or `vertical` (stacked). Default `horizontal`. */
  readonly orientation?: Orientation;
  readonly defaultSizes?: ReadonlyArray<number>;
  readonly sizes?: ReadonlyArray<number>;
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, provide, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';

/**
 * Renders two-or-more resizable panes split by draggable separators. Compose
 * `<ResizablePanel>` and `<ResizableSeparator>` as children — each claims its
 * index from this root through the injected context.
 */
defineOptions({ name: 'ResizablePanelsLayout', inheritAttrs: false });

/** The panels and separators — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ResizablePanelsLayoutProps>(), {
  orientation: Orientation.Horizontal,
  defaultSizes: undefined,
  sizes: undefined,
});

const emit = defineEmits<{ 'update:sizes': [sizes: ReadonlyArray<number>] }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

interface PanelEntry {
  token: symbol;
  info: PanelInfo;
}

const panelEntries = ref<Array<PanelEntry>>([]);
const separatorTokens = ref<Array<symbol>>([]);
const panelCount = computed(() => panelEntries.value.length);

const controlled = useControlled<ReadonlyArray<number>>({
  controlled: () => props.sizes,
  default: props.defaultSizes ?? [],
  onChange: (next) => emit('update:sizes', next),
});

/** Registration derives a layout without emitting user intent into a controlled model. */
const sizes = computed<ReadonlyArray<number>>(() => {
  const count = panelCount.value;
  if (controlled.value.value.length === count) return controlled.value.value;
  if (props.defaultSizes?.length === count) return props.defaultSizes;
  return Array<number>(count).fill(100 / Math.max(count, 1));
});

function resizePair(separatorIndex: number, desiredA: number, current = sizes.value): void {
  const a = separatorIndex;
  const b = a + 1;
  const aInfo = panelEntries.value[a]?.info;
  const bInfo = panelEntries.value[b]?.info;
  if (!aInfo || !bInfo) return;
  const total = current[a]! + current[b]!;
  const lower = Math.max(aInfo.minSize, total - bInfo.maxSize);
  const upper = Math.min(aInfo.maxSize, total - bInfo.minSize);
  if (![total, desiredA, lower, upper].every(Number.isFinite) || lower > upper) return;
  const next = current.slice();
  next[a] = Math.max(lower, Math.min(upper, desiredA));
  next[b] = total - next[a]!;
  if (next[a] !== sizes.value[a] || next[b] !== sizes.value[b]) controlled.setValue(next);
}

function applyDelta(separatorIndex: number, deltaPct: number): void {
  resizePair(separatorIndex, sizes.value[separatorIndex]! + deltaPct);
}

let dragCleanup: (() => void) | null = null;
onScopeDispose(() => dragCleanup?.());
watch(
  () => props.orientation,
  () => dragCleanup?.(),
);

function beginDrag(separatorIndex: number, event: MouseEvent): boolean {
  dragCleanup?.();
  const container = el.value;
  if (!container || !panelEntries.value[separatorIndex + 1]) return false;
  const orientation = props.orientation;
  const rect = container.getBoundingClientRect();
  const total = orientation === Orientation.Horizontal ? rect.width : rect.height;
  if (!Number.isFinite(total) || total <= 0) return false;
  const startSizes = sizes.value.slice();
  const cursor = orientation === Orientation.Horizontal ? 'col-resize' : 'row-resize';
  const style = document.body.style;
  const previous = ['cursor', 'user-select'].map((name) => ({
    name,
    value: style.getPropertyValue(name),
    priority: style.getPropertyPriority(name),
  }));
  const onMove = (e: MouseEvent): void => {
    const delta = orientation === Orientation.Horizontal ? e.clientX - event.clientX : e.clientY - event.clientY;
    resizePair(separatorIndex, startSizes[separatorIndex]! + (delta / total) * 100, startSizes);
  };
  const onUp = (): void => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    for (const { name, value, priority } of previous) {
      const ownedValue = name === 'cursor' ? cursor : 'none';
      if (style.getPropertyValue(name) === ownedValue) style.setProperty(name, value, priority);
    }
    dragCleanup = null;
  };
  style.cursor = cursor;
  style.userSelect = 'none';
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  dragCleanup = onUp;
  return true;
}

function resetPair(separatorIndex: number): void {
  const aInfo = panelEntries.value[separatorIndex]?.info;
  const bInfo = panelEntries.value[separatorIndex + 1]?.info;
  if (!aInfo || !bInfo) return;
  const total = sizes.value[separatorIndex]! + sizes.value[separatorIndex + 1]!;
  const defaults = aInfo.defaultSize + bInfo.defaultSize;
  resizePair(separatorIndex, defaults > 0 ? (total * aInfo.defaultSize) / defaults : total / 2);
}

provide(resizableContextKey, {
  get orientation() {
    return props.orientation;
  },
  get sizes() {
    return sizes.value;
  },
  get panels() {
    return panelEntries.value.map((entry) => entry.info);
  },
  registerPanel: (token, info) => {
    panelEntries.value = [...panelEntries.value, { token, info }];
  },
  updatePanel: (token, info) => {
    panelEntries.value = panelEntries.value.map((entry) => (entry.token === token ? { token, info } : entry));
  },
  unregisterPanel: (token) => {
    panelEntries.value = panelEntries.value.filter((entry) => entry.token !== token);
  },
  panelIndex: (token) => panelEntries.value.findIndex((entry) => entry.token === token),
  registerSeparator: (token) => {
    separatorTokens.value = [...separatorTokens.value, token];
  },
  unregisterSeparator: (token) => {
    separatorTokens.value = separatorTokens.value.filter((existing) => existing !== token);
  },
  separatorIndex: (token) => separatorTokens.value.indexOf(token),
  beginDrag,
  nudge: applyDelta,
  resetPair,
});

const classes = computed(() =>
  cn(
    'flex h-full w-full',
    props.orientation === Orientation.Horizontal ? 'flex-row' : 'flex-col',
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
  <div ref="el" :data-orientation="orientation" v-bind="rest" :class="classes">
    <slot />
  </div>
</template>
