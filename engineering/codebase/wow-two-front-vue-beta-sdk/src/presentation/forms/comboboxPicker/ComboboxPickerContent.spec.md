# ComboboxPickerContent

Renders the option rows in a portalled panel anchored under the input, dismissed on Escape or outside click.

Source: [ComboboxPickerContent.vue](ComboboxPickerContent.vue).

Public import: `import { ComboboxPickerContent } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useComboboxContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `placement` | `Placement` | no | `'bottom'` | The floating placement of the panel. |
| `offset` | `number` | no | `6` | The gap between the input and the panel, in px. |
| `variant` | `SurfaceVariant` | no | `raised` | The visual recipe. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Defaults to `xs` (p-1), so items breathe — same as ListboxPicker. |
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
