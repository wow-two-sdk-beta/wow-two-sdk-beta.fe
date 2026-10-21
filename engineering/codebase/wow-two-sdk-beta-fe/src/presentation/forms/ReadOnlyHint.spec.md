# ReadOnlyHint

Renders the visually hidden "Read only" description of a read-only control whose role has no `aria-readonly`.

Source: [ReadOnlyHint.vue](ReadOnlyHint.vue), with [UseReadOnlyHint.ts](UseReadOnlyHint.ts).

Internal implementation: compose through the family's public exports in [index.ts](index.ts).

## Contract

- A control whose role allows `aria-readonly` (`combobox`, `listbox`, `slider`, `checkbox`, `switch`) or a native `readonly` sets that and renders no hint. A `button`, `group`, `img`, `radio` or drop zone has no such attribute: it calls `useReadOnlyHint(isReadOnly)`, renders `<ReadOnlyHint :id="hintId" />` beside itself while `isShown`, and points `aria-describedby` at `describedBy(ownIds)`, which appends the hint's id to the control's own description ids.
- The text is the locale key `Field.readOnly`, default `Read only`, and follows `LocaleProvider`.
- The hint is visually hidden, not `display: none`, so it stays in the accessibility tree and in the control's accessible description.
- The hint id comes from Vue's `useId`, so a server render and its hydration agree.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | `string` | yes | — | The element id the read-only control references from `aria-describedby`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through the controls that use it: [ReadOnlyState.browser.test.ts](../../../../tests/unit/presentation/forms/ReadOnlyState.browser.test.ts), [ReadOnlyControls.browser.test.ts](../../../../tests/unit/presentation/forms/ReadOnlyControls.browser.test.ts) and [ReadOnlyAria.dom.test.ts](../../../../tests/unit/presentation/forms/ReadOnlyAria.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
