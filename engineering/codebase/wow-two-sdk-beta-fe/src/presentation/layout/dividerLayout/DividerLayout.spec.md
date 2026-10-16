# DividerLayout

Renders a thin rule between content — plain on a stated axis, or horizontal with a centred label.

Source: [DividerLayout.vue](DividerLayout.vue).

Public import: `import { DividerLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Props follow `DividerLayoutProps`; resolve the imported contract from the source imports.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
