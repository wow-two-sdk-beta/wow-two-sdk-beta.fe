# CopyButton

Renders a clipboard-copy button — for code blocks, ID / URL fields, and inline copy affordances.

Source: [CopyButton.vue](CopyButton.vue).

Public import: `import { CopyButton } from '@wow-two-beta/ui-vue/presentation/actions';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ CopyButtonAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `text` | `string` | yes | — | The text to copy when the button is activated. |
| `resetAfter` | `number` | no | `2000` | The reset window for the `copied` state in ms. Default 2000. Set 0 to hold `copied` until the next mount. |
| `copiedAriaLabel` | `string` | no | — | The accessible name to announce while `copied` is true. Falls back to `aria-label` when omitted. |
| `variant` | `ButtonVariant` | no | `ButtonVariant.Ghost` | The visual surface style. Default `ghost`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `error` | `error: [error: Error];` | Fires when `navigator.clipboard.writeText` rejects, once per error transition. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?: (props: { copied: boolean; error: Error \| null }) => unknown;` | The content — receives `{ copied, error }` for a state-driven swap. Icon-only Copy/Check when omitted. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Actions.a11y.dom.test.ts](../../../../tests/unit/presentation/actions/Actions.a11y.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
