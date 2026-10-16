# TreeSelectPicker

Renders a trigger that opens a tree of options and shows the picked leaf.

Source: [TreeSelectPicker.vue](TreeSelectPicker.vue) · [TreeSelectPickerNode.vue](TreeSelectPickerNode.vue) (internal) · tree: [TreeViewer](../../display/treeViewer/TreeViewer.spec.md).

Public import: `import { TreeSelectPicker, type TreeSelectNode } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is the picked leaf's `value`, or `null`. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper; picking closes the popover.
- `nodes` describe the tree. A node with children is a branch: activating it expands or collapses it, and it is never picked. A node without children is a leaf. Disabled nodes neither pick nor expand.
- The popover holds a `TreeViewer` (`role="tree"`, roving focus, arrow-key navigation). It opens with the picked leaf's branches expanded.
- The trigger shows the leaf label, or its full path (`Europe / France / Paris`) with `isPathShown`. A value no leaf describes shows as its raw value.
- Disabled, read-only and invalid states fall back to the surrounding `Field`, as do the trigger's id, label and description. Attributes and `class` reach the trigger.
- A `name` ships the leaf value in a hidden input; native form reset restores the default.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `nodes` | `ReadonlyArray<TreeSelectNode>` | yes | — | The top-level nodes: `{ value, label, children?, isDisabled? }`. |
| `modelValue` | `string \| null` | no | — | The picked leaf, controlled — the `v-model` target. |
| `defaultValue` | `string \| null` | no | `null` | The initial leaf when uncontrolled. |
| `isPathShown` | `boolean` | no | `false` | Shows the leaf's full path on the trigger. |
| `placeholder` | `string` | no | `'Pick an item'` | The trigger text with nothing picked; localized as `TreeSelectPicker.placeholder`. |
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `id` | `string` | no | Field id | The trigger id. |
| `isDisabled` | `boolean` | no | Field state | Blocks interaction. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the value but blocks changes. |
| `isInvalid` | `boolean` | no | Field state | Styles the trigger as invalid. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string \| null];` | Fires when the reader picks a leaf. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [TreeSelectPicker.dom.test.ts](../../../../tests/unit/presentation/forms/TreeSelectPicker.dom.test.ts) — preset path label, expanded ancestors, leaf picks, branch expansion, disabled leaves, hidden value and read-only.
