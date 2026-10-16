# ListboxPickerSeparator

Renders a decorative rule between groups of items, hidden from the accessibility tree.

Source: [ListboxPickerSeparator.vue](ListboxPickerSeparator.vue).

Public import: `import { ListboxPickerSeparator } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

No declared props.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
