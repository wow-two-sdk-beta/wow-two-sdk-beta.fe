# AccordionGroupItem

Renders one disclosure panel, pairing an `AccordionGroupTrigger` with its `AccordionGroupContent`.

Source: [AccordionGroupItem.vue](AccordionGroupItem.vue).

Public import: `import { AccordionGroupItem } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useAccordionContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The identity of this panel within the group's open set. |
| `isDisabled` | `boolean` | no | `false` | The disabled state for this item alone. Default `false`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
