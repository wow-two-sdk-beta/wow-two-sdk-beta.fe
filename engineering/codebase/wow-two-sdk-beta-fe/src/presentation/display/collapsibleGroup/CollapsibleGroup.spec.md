# CollapsibleGroup

Renders the disclosure root that owns the open state and the trigger / content id pair.

Source: [CollapsibleGroup.vue](CollapsibleGroup.vue).

Public import: `import { CollapsibleGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The uncontrolled initial state. Default `false`. |
| `isDisabled` | `boolean` | no | `false` | The disabled mode — the trigger stops toggling. Default `false`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the pane opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
