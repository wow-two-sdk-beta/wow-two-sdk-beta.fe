# Announce

## Purpose
Visually-hidden ARIA live region for screen-reader announcements. Used by ToastHost (and any component that needs to announce a transient state change without visible feedback).

## Props
| Name | Type | Default | Why |
|---|---|---|---|
| `politeness` | `'polite' \| 'assertive'` | `'polite'` | Maps to `role="status"` (polite) or `role="alert"` (assertive). |
| default slot | — | — | Message body. Live region re-announces when it changes. |

## Composition model
Plain `<div>` with attribute fallthrough (`inheritAttrs: false`, so `class` routes through `cn`). No state, no teleport — caller decides where it lives in the tree. For simple cases, mount a stable `<Announce>` and swap its slot content to push messages.

## Accessibility
- `role="status"` (polite) / `role="alert"` (assertive)
- `aria-live` matches politeness
- `aria-atomic="true"` so the entire content is announced on change
- Visually hidden via the same clip-path technique as `VisuallyHidden`

## Dependencies
Foundation: `utils/cn`. Sibling-primitive-proof — no other primitives.

## Inspirations
Radix `LiveRegion`, React Aria `Announcer`. Ours is the simplest possible: one component, no context, no queue.

## Port note
The React original forwarded a ref to the `<div>`. Vue resolves a parent's template ref to the component instance, whose `$el` is that same `<div>` — no explicit forwarding needed.
