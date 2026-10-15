# SelectPickerContent

Renders the floating panel below the trigger — an optional search box over the listbox of options.

Source: [SelectPickerContent.vue](SelectPickerContent.vue).

Public import: `import { SelectPickerContent } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useSelectContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `SurfaceVariant` | no | `raised` (from `PopoverContent`) | The visual recipe. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Defaults to `none`. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |
| `isSearchable` | `boolean` | no | `false` | The searchable state, rendering a search input above the items and filtering by label substring. |
| `searchPlaceholder` | `string` | no | `'Search…'` | The placeholder of the search input. |
| `noResultsLabel` | `string \| number` | no | `'No results'` | The label rendered when the search yields no matches. |
| `hasTriggerWidth` | `boolean` | no | `false` | Locks the surface width to the trigger's, truncating long items. Default `false`.               |
| `matchWidth` | `boolean` | no | —       | Deprecated — use `hasTriggerWidth`; removed next release.                                       |

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
