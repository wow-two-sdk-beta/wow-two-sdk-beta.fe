# MultiSelectPickerContent

Renders the floating panel below the trigger, hosting the rows as a multi-selection listbox.

Source: [MultiSelectPickerContent.vue](MultiSelectPickerContent.vue).

Public import: `import { MultiSelectPickerContent } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useMultiSelectContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `SurfaceVariant` | no | — | The visual recipe. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Defaults to `none`. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
