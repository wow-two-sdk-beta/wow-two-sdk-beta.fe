# ListDetailLayout

Renders a master-detail page: list and detail side by side from `breakpoint`, one at a time below it.

Source: [ListDetailLayout.vue](ListDetailLayout.vue).

Public import: `import { ListDetailLayout } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- The consumer owns `isDetailOpen`. Derive it from the route (a selection query) so the browser's back button and a
  deep link drive the same swap as the back control — `useListDetailRoute` from `@wow-two-beta/fe/router` holds the
  selection in query keys and answers `back`.
- From `breakpoint` up the panes form a grid row — the list column `listWidth` wide, the detail the rest — and both stay
  visible whatever `isDetailOpen` says. Spacing between them comes from a caller `gap-*` class.
- Below `breakpoint` exactly one pane shows: the list while `isDetailOpen` is `false`, the detail while it is `true`.
  The hidden pane stays mounted, so list state (search text, loaded pages) survives the swap.
- Below `breakpoint` a back control heads the detail pane. It emits `back`; the layout never closes the detail itself.
  The `back` slot replaces the control and receives `back` and the resolved `label`. `backClass` pads the row that
  holds it to match padded detail content; it cannot show the row side by side.
- The breakpoint is read from CSS, so the layout follows an app's own `@theme` breakpoints; it renders the same markup on
  the server and the client.
- Focus and scroll move only when the panes swap below `breakpoint`; a change while side by side moves nothing, and the
  initial render never takes focus.
  - Opening: the list's scroll offsets (its own scrollers and the nearest scrolling ancestor) are saved, the layout's
    top is scrolled into view if the list had scrolled past it, and focus moves to the detail's
    `[data-list-detail-heading]`, else its first `h1`–`h6`, else the detail pane. A heading without `tabindex` gains
    `tabindex="-1"`.
  - Returning: the saved offsets are restored, then focus moves to the list control that opened the detail — the one
    last clicked, tapped or activated with Enter / Space within the last second, else the focused one — else the item
    marked `aria-current`, `aria-selected="true"`, `aria-pressed="true"` or `data-selected`, else the list pane. The
    activation outranks focus because WebKit never focuses a clicked button and an iOS tap leaves focus in place.
- Scrolling is instant, never smooth, so reduced motion needs no branch.
- The root carries `data-view` (`list` · `detail`); each pane carries `data-list-detail-pane`.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isDetailOpen` | `boolean` | no | `false` | Whether a detail is open; below `breakpoint` it replaces the list. |
| `breakpoint` | `Breakpoint` | no | `lg` | The panes sit side by side from this breakpoint. |
| `listWidth` | `string` | no | `20rem` | The list column's width from `breakpoint` up, any CSS length. |
| `backLabel` | `string` | no | locale `Back` | The back control's label. |
| `backClass` | `HTMLAttributes['class']` | no | — | The back row's class, merged over the default `mb-2`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `back` | `back: []` | The reader asked to return to the list; set `isDetailOpen` to `false` or step the route back. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `list` | `list(): unknown` | The list pane. |
| `detail` | `detail(): unknown` | The detail pane's content; its first heading takes focus on open. |
| `back` | `back?(props: { back: () => void; label: string }): unknown` | Replaces the default back control. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [ListDetailLayout.dom.test.ts](../../../../tests/unit/presentation/layout/ListDetailLayout.dom.test.ts),
  [ListDetailLayout.browser.test.ts](../../../../tests/unit/presentation/layout/ListDetailLayout.browser.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
