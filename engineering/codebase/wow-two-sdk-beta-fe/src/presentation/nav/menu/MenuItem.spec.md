# MenuItem

Renders one activatable menu row — a button, a link (`href`) or the caller's own link element (`asChild`); the arrow
keys walk the enabled siblings.

Source: [MenuItem.vue](MenuItem.vue).

Public import: `import { MenuItem } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- Mount within the owner supplying `useMenuContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Without `href` or `asChild` the row is a `<button type="button">`.
- With `href` the row is an `<a role="menuitem">` the browser follows on activation. `href` passes the navigation
  check (http, https, mailto, tel or a relative path); any other scheme renders the button row.
- `target` and `rel` reach the anchor. `rel` defaults to `noopener noreferrer` when `href` is an absolute web URL
  (`https://…`, `//…`) or `target` is `_blank`, and to none otherwise; an explicit `rel` wins, `""` sets none.
- A `_blank` link ends with a visually hidden ` (opens in a new tab)`: `newTabLabel`, else the
  `MenuItem.newTabLabel` message from the nearest `LocaleProvider`. `newTabLabel=""` omits it.
- `asChild` renders the single slot element as the row — the router integration, with `AppLink` from
  `@wow-two-beta/fe/router` as the child. `role`, the disabled state, `class` and the handlers merge onto it; its own
  handlers run first.
- A disabled link keeps the anchor without its `href`, sets `aria-disabled` and `data-disabled`, and never activates.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `state` | `MenuItemState` | no | `undefined` | The visual state of the item. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state — blocks activation. |
| `canCloseOnSelect` | `boolean` | no | `true` | Closes the whole menu tree after activation; `false` keeps it open for repeated actions. |
| `closeOnSelect` | `boolean` | no | — | Deprecated — use `canCloseOnSelect`; removed next release. |
| `href` | `string` | no | — | The link destination; set, the row is an anchor. |
| `target` | `string` | no | — | The link's browsing context; `_blank` opens a new tab and adds the new-tab label. |
| `rel` | `string` | no | `noopener noreferrer` for an absolute URL or a new tab | The link relationship; `""` sets none. |
| `asChild` | `boolean` | no | `false` | Renders the single child element — a router `AppLink` — as the row. |
| `newTabLabel` | `string` | no | locale `(opens in a new tab)` | The screen-reader text after a new-tab link; `""` omits it. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when the reader activates the row with Enter, Space, or a click; the menu tree closes after by default. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The row content; under `asChild`, the single element that becomes the row. |

## Exposed handle

`{ el }` — the row element: the button, the anchor or the `asChild` element. Read this through a component template
ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [LiveValues.dom.test.ts](../../../../tests/unit/presentation/nav/LiveValues.dom.test.ts) · [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts) · [MenuItemLink.dom.test.ts](../../../../tests/unit/presentation/nav/MenuItemLink.dom.test.ts) · [MenuVector.browser.test.ts](../../../../tests/unit/presentation/nav/MenuVector.browser.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

Arrow, Home and End walk every enabled row kind of the menu, wrapping at the edges; link rows join the walk like
button rows. A mouse move focuses the row, so pointer and keyboard share one highlight; touch and pen only activate.
Inside a submenu, activation closes the whole menu tree.

Enter and Space activate every row. On a link row they click it once — the key's own default is prevented — so the
browser follows the link, or a router link navigates, and the row emits `select` and closes the menu. A click on a
link row closes the menu even when a router link prevented the browser's own navigation; `canCloseOnSelect: false`
keeps it open. A button row ignores a click whose default a handler prevented.
