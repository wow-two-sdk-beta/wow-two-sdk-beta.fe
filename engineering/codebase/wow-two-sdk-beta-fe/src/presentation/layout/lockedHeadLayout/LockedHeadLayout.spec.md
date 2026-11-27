# LockedHeadLayout

Renders a page whose head holds still while only its body scrolls, inside an `AppFrame` on a tablet and a desktop.

Source: [LockedHeadLayout.vue](LockedHeadLayout.vue).

Public import: `import { LockedHeadLayout } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- The page registers with the nearest `AppFrame` on mount and unregisters on unmount. While a page is registered and
  the frame does not serve the phone layout, the page is locked.
- Locked, the page fills the height main leaves it: the frame turns main and its page column into flex columns with
  `min-h-0`, main scrolls nothing (its scroll range is 0) and the page ends at main's bottom edge.
- Locked, the head is `shrink-0` and paints no fill of its own: nothing scrolls under it.
- Locked, the body is the page's one scroll container (`flex-1 min-h-0 overflow-y-auto`, gutter reserved) and carries
  `ScrollRegionAttribute`, so the app router saves, restores and resets its scroll as it does main's.
- Locked, the page column's end padding moves to the body's end: the frame's `lg` gutter under
  `contentWidth="default"`, none under `full`. A `contentClass` or `mainClass` bottom padding without a breakpoint
  is dropped while locked; pass the page's own end space through `bodyClass`.
- On a phone (the frame's phone layout: `isPhone`, a provided phone class, or a viewport below `md`), on the server,
  in the first render and outside a frame, the head and the body flow and main scrolls the page as it does today.
- Several registered pages keep the lock until the last one unregisters, so a route transition never drops it.
- The lock is CSS only: no element is measured and nothing observes a size.
- Attributes and `class` reach the root; `headClass` and `bodyClass` reach the head and the body.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `headClass` | `HTMLAttributes['class']` | no | `undefined` | Extra classes on the head. |
| `bodyClass` | `HTMLAttributes['class']` | no | `undefined` | Extra classes on the body, the scroll region while locked. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `head` | `head?(): unknown` | What holds still above the body: a banner, the tabs, a page header. |
| `default` | `default?(): unknown` | The body, which scrolls under the head while locked. |

## Exposed handle

`{ el, bodyEl, isLocked }` — the root, the body (the scroll container while locked, for a load-more observer) and
whether the page is locked. Read it through a template ref after mount.

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| every element | none: the layout has no control and changes no box under touch | none |

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts).
- Focused tests: [LockedHeadLayout.dom.test.ts](../../../../tests/unit/presentation/layout/LockedHeadLayout.dom.test.ts),
  [LockedHeadLayout.browser.test.ts](../../../../tests/unit/presentation/layout/LockedHeadLayout.browser.test.ts)
  and the coarse-pointer placement suite.
