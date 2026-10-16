<script lang="ts">
export interface TreeViewerGroupProps {
  /** The branch value — the key expansion is tracked under. */
  readonly value: string;
  /**
   * The branch label. React took a `ReactNode`; the scalar stays a prop and the
   * same-named `label` slot is the rich override.
   */
  readonly label: string | number;
  /** The disabled state. Default `false`. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { Presence } from '../../../foundation/primitives';
import { useTreeContext, useTreeLevel } from './TreeViewerContext';
import TreeViewerGroupContent from './TreeViewerGroupContent.vue';
import TreeViewerNodeRow from './TreeViewerNodeRow.vue';

/** Renders an expandable branch of a `TreeViewer`; React shipped it as `TreeViewer.Group`. */
defineOptions({ name: 'TreeViewerGroup', inheritAttrs: false });

defineSlots<{
  /** The nested `TreeViewerGroup` / `TreeViewerItem` children — React's required `children`. */
  default(): unknown;
  /** Overrides the branch label. Falls back to the `label` prop. */
  label(): unknown;
}>();

const props = withDefaults(defineProps<TreeViewerGroupProps>(), { isDisabled: false });

const attrs = useAttrs();
const el = useTemplateRef<HTMLLIElement>('el');
const tree = useTreeContext();
const treeLevel = useTreeLevel();

const isExpanded = computed(() => tree.expanded.has(props.value));

function activate(): void {
  tree.toggleExpanded(props.value);
}

const classes = computed(() => cn('list-none', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <li ref="el" role="presentation" :data-state="isExpanded ? 'open' : 'closed'" v-bind="rest" :class="classes">
    <TreeViewerNodeRow
      :level="treeLevel.level"
      :is-selected="false"
      :is-expanded="isExpanded"
      has-children
      :is-disabled="isDisabled"
      :on-activate="activate"
    >
      <slot name="label">{{ label }}</slot>
    </TreeViewerNodeRow>
    <!-- Presence keeps the group mounted through the collapse so the exit
         plays before unmount (a plain `v-if` hard-unmount would kill it).
         It injects ref + data-state onto TreeViewerGroupContent, which animates height
         via grid-template-rows 0fr -> 1fr. -->
    <Presence :is-present="isExpanded">
      <TreeViewerGroupContent :level="treeLevel.level + 1">
        <slot />
      </TreeViewerGroupContent>
    </Presence>
  </li>
</template>
