<script lang="ts">
/** Internal — the tree pane of `JsonEditor`. Not exported from the folder barrel. */
export interface JsonEditorTreeViewProps {
  /** The document rendered as a tree. */
  readonly value: unknown;
}
</script>

<script setup lang="ts">
import { useFormControl } from '../../../foundation/primitives';
import { useJsonEditorContext } from './JsonEditorContext';
import JsonEditorTreeNode from './JsonEditorTreeNode.vue';

/** Renders the document as an ARIA tree of nodes, and carries the surrounding field's labelling. */
defineOptions({ name: 'JsonEditorTreeView' });

defineProps<JsonEditorTreeViewProps>();

/* In tree mode the tree IS the editing surface — it carries the context id
   (label anchor) and is named/described by the Field chrome. */
const ctx = useFormControl();
const editor = useJsonEditorContext();
</script>

<template>
  <ul
    role="tree"
    :id="ctx?.id"
    :aria-labelledby="ctx?.labelledBy"
    :aria-describedby="ctx?.describedBy"
    :aria-invalid="editor.isInvalid || undefined"
    class="font-mono text-sm"
  >
    <JsonEditorTreeNode :key-name="null" :value="value" :path="[]" :depth="0" />
  </ul>
</template>
