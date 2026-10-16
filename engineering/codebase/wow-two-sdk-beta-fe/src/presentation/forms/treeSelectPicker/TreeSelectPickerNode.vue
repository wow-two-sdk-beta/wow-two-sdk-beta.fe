<script lang="ts">
// One node of a TreeSelectPicker's tree, rendering itself for nested children. Internal — not exported from the
// family barrel.
import type { TreeSelectNode } from './TreeSelectPicker.vue';

/** Defines props for one rendered tree node. */
export interface TreeSelectPickerNodeProps {
  /** The node to render — a branch when it has children, else a pickable leaf. */
  readonly node: TreeSelectNode;
}
</script>

<script setup lang="ts">
import { TreeViewerGroup, TreeViewerItem } from '../../display';

/** Renders a branch (with its children) or a leaf of the picker's tree. */
defineOptions({ name: 'TreeSelectPickerNode' });

defineProps<TreeSelectPickerNodeProps>();
</script>

<template>
  <TreeViewerGroup
    v-if="node.children && node.children.length > 0"
    :value="node.value"
    :label="node.label"
    :is-disabled="node.isDisabled"
  >
    <TreeSelectPickerNode v-for="child in node.children" :key="child.value" :node="child" />
  </TreeViewerGroup>
  <TreeViewerItem v-else :value="node.value" :is-disabled="node.isDisabled">{{ node.label }}</TreeViewerItem>
</template>
