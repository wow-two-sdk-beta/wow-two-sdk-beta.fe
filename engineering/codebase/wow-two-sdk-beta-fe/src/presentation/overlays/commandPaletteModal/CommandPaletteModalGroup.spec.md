# CommandPaletteModalGroup

Renders a labelled `role="group"` band of palette items.

Source: [CommandPaletteModalGroup.vue](CommandPaletteModalGroup.vue).

Public import: `import { CommandPaletteModalGroup } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The group heading. the scalar form is the prop and `#label` is the rich override. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The grouped items — the default slot. |
| `label` | `label?(): unknown;` | The rich override for the `label` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
