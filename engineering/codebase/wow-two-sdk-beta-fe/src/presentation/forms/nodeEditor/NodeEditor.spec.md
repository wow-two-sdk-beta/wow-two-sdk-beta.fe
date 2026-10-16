# NodeEditor

Renders a pannable, wheel-zoomable node graph whose nodes drag to reposition.

Source: [NodeEditor.vue](NodeEditor.vue).

Public import: `import { NodeEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The caller owns nodes; drag, arrow keys and movement buttons emit the same full-array update:nodes intent.
- Each node can be focused and moved by arrows. The native node selector and direction buttons provide single-pointer alternatives to dragging.
- Edges expose a keyboard-activatable button with their label or id. Built-in action labels can be localized.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `labels` | `Partial< Record<'selectNode' \| 'left' \| 'right' \| 'up' \| 'down' \| 'zoomIn' \| 'zoomOut' \| 'fit', string> >` | no | — | Localized labels for the built-in movement and viewport actions. |
| `nodes` | `ReadonlyArray<NodeEditorNode>` | yes | — | Declared by the source contract. |
| `edges` | `ReadonlyArray<NodeEditorEdge>` | no | `() => []` | Declared by the source contract. |
| `nodeWidth` | `number` | no | `160` | The node box width in px. Default `160`. |
| `nodeHeight` | `number` | no | `60` | The node box height in px. Default `60`. |
| `minZoom` | `number` | no | `0.25` | The lower zoom bound. Default `0.25`. |
| `maxZoom` | `number` | no | `2` | The upper zoom bound. Default `2`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:nodes` | `'update:nodes': [nodes: ReadonlyArray<NodeEditorNode>];` | Requests the full node list after a drag, arrow key or movement button. |
| `edge-click` | `'edge-click': [edge: NodeEditorEdge];` | Fires when the reader clicks an edge, with that edge. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `node` | `node(props: { node: NodeEditorNode }): unknown;` | Replaces a node's box. Falls back to the default card with its `label` / `id`. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [EditingBehavior.dom.test.ts](../../../../tests/unit/presentation/forms/EditingBehavior.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
