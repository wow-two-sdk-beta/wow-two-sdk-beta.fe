# AlertModal

Renders a confirmation dialog — a `Modal` locked to `role="alertdialog"`, outside-click dismissal off.

Source: [AlertModal.vue](AlertModal.vue).

Public import: `import { AlertModal } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Props follow `AlertModalProps`; resolve the imported contract from the source imports.

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
