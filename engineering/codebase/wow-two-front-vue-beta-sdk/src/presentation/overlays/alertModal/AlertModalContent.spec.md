# AlertModalContent

Renders the alert dialog's panel — `ModalContent` verbatim; the alert semantics live on the root.

Source: [AlertModalContent.vue](AlertModalContent.vue).

Public import: `import { AlertModalContent } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Every `ModalContent` prop forwards unchanged; an absent prop keeps `ModalContent`'s default (the backdrop shows).
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Props follow `AlertModalContentProps`; resolve the imported contract from the source imports.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
