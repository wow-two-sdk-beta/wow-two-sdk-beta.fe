# TreeViewer

Renders the tree root that owns selection and expansion for its branches and leaves.

Source: [TreeViewer.vue](TreeViewer.vue).

Public import: `import { TreeViewer } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string \| null` | no | `undefined` | The controlled selected leaf value. |
| `defaultValue` | `string \| null` | no | `undefined` | The uncontrolled initial selected leaf value. |
| `expanded` | `ReadonlyArray<string>` | no | `undefined` | The controlled expanded branch values. |
| `defaultExpanded` | `ReadonlyArray<string>` | no | `undefined` | The uncontrolled initial expanded branch values. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader selects a leaf, with its value. |
| `update:expanded` | `'update:expanded': [values: ReadonlyArray<string>];` | Fires when the reader expands or collapses a branch, with the full expanded list. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el: HTMLElement | null }` targets the inner Card or RovingFocusGroup DOM root, not its component instance. Read after mount; the handle is null before mount and after the child unmounts. It is suitable for native focus, measurement and scrolling; it does not expose child implementation methods.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
