<script lang="ts">
export interface TreeViewerProps {
  /** The controlled selected leaf value. */
  readonly modelValue?: string | null;
  /** The uncontrolled initial selected leaf value. */
  readonly defaultValue?: string | null;
  /** The controlled expanded branch values. */
  readonly expanded?: ReadonlyArray<string>;
  /** The uncontrolled initial expanded branch values. */
  readonly defaultExpanded?: ReadonlyArray<string>;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { RovingFocusGroup, type ComponentElement } from '../../../foundation/primitives';
import { TreeViewerKey, type TreeViewerContextValue } from './TreeViewerContext';

/**
 * Renders the tree root that owns selection and expansion for its branches and leaves.
 *
 * `TreeViewerGroup` / `TreeViewerItem` read them through injection — React attached those as `TreeViewer.Group`
 * / `.Item` statics,
 * which an SFC's default export cannot carry.
 */
defineOptions({ name: 'TreeViewer', inheritAttrs: false });

/** The `TreeViewerGroup` / `TreeViewerItem` children — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TreeViewerProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  expanded: undefined,
  defaultExpanded: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader selects a leaf, with its value. */
  'update:modelValue': [value: string];
  /** Fires when the reader expands or collapses a branch, with the full expanded list. */
  'update:expanded': [values: ReadonlyArray<string>];
}>();

const attrs = useAttrs();
const el = useTemplateRef<ComponentElement>('el');

const { value: selected, setValue: setSelected } = useControlled<string | null>({
  controlled: () => props.modelValue,
  default: props.defaultValue ?? null,
  /* Only ever called with a string — `setSelectedValue` is the single writer. */
  onChange: (next) => emit('update:modelValue', next as string),
});

const { value: expandedList, setValue: setExpandedList } = useControlled<ReadonlyArray<string>>({
  controlled: () => props.expanded,
  default: props.defaultExpanded ?? [],
  onChange: (next) => emit('update:expanded', next),
});

const expandedSet = computed(() => new Set(expandedList.value));

function toggleExpanded(value: string): void {
  const next = new Set(expandedSet.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  setExpandedList(Array.from(next));
}

/* Live getters, not a snapshot — selection and expansion have to reach every
   already-mounted row. */
provide<TreeViewerContextValue>(TreeViewerKey, {
  get selectedValue() {
    return selected.value;
  },
  setSelectedValue: setSelected,
  get expanded() {
    return expandedSet.value;
  },
  toggleExpanded,
});

const classes = computed(() => cn('flex flex-col text-sm', attrs.class as string | undefined));

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
  <RovingFocusGroup ref="el" orientation="vertical" can-loop role="tree" v-bind="rest" :class="classes">
    <slot />
  </RovingFocusGroup>
</template>
