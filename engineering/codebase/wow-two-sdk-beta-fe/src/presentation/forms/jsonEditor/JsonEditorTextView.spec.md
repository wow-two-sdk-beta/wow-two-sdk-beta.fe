# JsonEditorTextView

Renders the document as a pretty-printed JSON textarea that parses on blur and shows parse errors.

Source: [JsonEditorTextView.vue](JsonEditorTextView.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useJsonEditorContext`; a compound part is not an independent root.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `unknown` | yes | — | The document rendered as pretty-printed JSON. |
| `indent` | `number` | yes | — | The `JSON.stringify` indent. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `commit` | `commit: [value: unknown];` | Fires when the reader leaves the textarea and the edited source parses as valid JSON. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
