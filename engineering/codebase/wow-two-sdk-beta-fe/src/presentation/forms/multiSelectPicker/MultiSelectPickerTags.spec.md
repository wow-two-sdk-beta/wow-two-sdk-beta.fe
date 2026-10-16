# MultiSelectPickerTags

Renders the selections as removable chips inside the trigger, collapsing the tail past `maxVisible` into `+N`.

Source: [MultiSelectPickerTags.vue](MultiSelectPickerTags.vue).

Public import: `import { MultiSelectPickerTags } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useMultiSelectContext`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `placeholder` | `string \| number` | no | — | The content shown when no values are selected. Fill the `placeholder` slot for richer content. |
| `maxVisible` | `number` | no | — | The number of chips rendered before the rest collapse into a `+N` block. Omit to render every selection. A declarative budget rather than a measured fit: the trigger wraps by default, so a measured overflow would never trigger, and measuring would put the chip strip behind a `ResizeObserver` frame — invisible until the browser paints. Capping is deterministic, renders identically on the server, and is the axis a caller actually wants to control. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `placeholder` | `placeholder?(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.regression.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.regression.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
