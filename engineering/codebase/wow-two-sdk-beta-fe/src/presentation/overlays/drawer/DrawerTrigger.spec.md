# DrawerTrigger

Renders the control that opens the enclosing `Drawer` and takes focus back on close.

Source: [DrawerTrigger.vue](DrawerTrigger.vue).

Public import: `import { DrawerTrigger } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Mount within the owner supplying `useDrawerContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `asChild` | `boolean` | no | `false` | Merge onto the single slot child instead of rendering a `<button>`. |

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
