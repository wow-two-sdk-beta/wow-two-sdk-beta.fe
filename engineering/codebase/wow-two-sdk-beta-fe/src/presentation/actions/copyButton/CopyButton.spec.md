# CopyButton

Renders a clipboard-copy button — for code blocks, ID / URL fields, and inline copy affordances.

Source: [CopyButton.vue](CopyButton.vue).

Public import: `import { CopyButton } from '@wow-two-beta/fe/presentation/actions';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- The copy writes through `navigator.clipboard.writeText`. When the Clipboard API is missing (a non-secure context, an older engine) or refuses the write, it retries through a hidden-textarea `document.execCommand('copy')`.
- Success sets `data-copied="true"` and shows the Check icon, then returns to Copy after `resetAfter`.
- Failure sets `data-error="true"`, shows the X icon in the destructive colour and emits `error`, then returns to Copy after `resetAfter`.

## Props

Inherited contracts: `extends /* @vue-ignore */ CopyButtonAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `text` | `string` | yes | — | The text to copy when the button is activated. |
| `resetAfter` | `number` | no | `2000` | The reset window for the `copied` state in ms. Default 2000. Set 0 to hold `copied` until the next mount. |
| `copiedAriaLabel` | `string` | no | — | The accessible name to announce while `copied` is true. Falls back to `aria-label` when omitted. |
| `failedAriaLabel` | `string` | no | — | The accessible name to announce while the last copy has failed. Falls back to `aria-label` when omitted. |
| `variant` | `ButtonVariant` | no | `ButtonVariant.Ghost` | The visual surface style. Default `ghost`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `error` | `error: [error: Error];` | Fires when the copy fails — the Clipboard API and the legacy fallback both refused — once per failure. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?: (props: { copied: boolean; error: Error \| null }) => unknown;` | The content — receives `{ copied, error }` for a state-driven swap. Icon-only Copy/Check/X when omitted. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Actions.a11y.dom.test.ts](../../../../tests/unit/presentation/actions/Actions.a11y.dom.test.ts) and [CopyButton.browser.test.ts](../../../../tests/unit/presentation/actions/CopyButton.browser.test.ts) (real clicks: copied, fallback, failure). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
