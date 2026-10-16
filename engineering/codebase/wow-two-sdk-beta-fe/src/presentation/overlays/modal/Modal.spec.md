# Modal

Renders only its slot, owning the open state and a11y ids of the Modal tree below it.

Source: [Modal.vue](Modal.vue).

Public import: `import { Modal } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |
| `canDismissOnOutsideClick` | `boolean` | no | `true` | The outside-click dismissal toggle. Default `true`. |
| `dismissOnOutsideClick` | `boolean` | no | —      | Deprecated — use `canDismissOnOutsideClick`; removed next release. |
| `canDismissOnEscape` | `boolean` | no | `true` | The Escape dismissal toggle. Default `true`. |
| `dismissOnEscape` | `boolean` | no | —      | Deprecated — use `canDismissOnEscape`; removed next release. |
| `role` | `ModalRole` | no | `'dialog'` | The ARIA dialog role. Internal — `AlertModal` overrides this. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the dialog opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
