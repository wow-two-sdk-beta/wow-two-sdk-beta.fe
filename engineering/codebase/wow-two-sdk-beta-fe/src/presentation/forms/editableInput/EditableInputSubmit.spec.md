# EditableInputSubmit

Renders the commit button, shown only while editing, that saves the draft and leaves edit mode.

Source: [EditableInputSubmit.vue](EditableInputSubmit.vue).

Public import: `import { EditableInputSubmit } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useEditableContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
