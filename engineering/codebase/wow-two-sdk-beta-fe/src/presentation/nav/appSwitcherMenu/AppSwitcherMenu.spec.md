# AppSwitcherMenu

Renders the app-switcher menu: one trigger naming the current app, which opens a suite's other apps and its public
sites.

Source: [AppSwitcherMenu.vue](AppSwitcherMenu.vue).

Public import: `import { AppSwitcherMenu, AppSwitcherKind } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- The trigger is one button: the `mark` slot, the app name (`label`, else the current item's label, else `title`),
  `subtitle` from `breakpoint` up, and a chevron that turns while the menu is open. It carries `aria-haspopup="dialog"`,
  `aria-expanded`, `data-state` (`open` · `closed`) and the `triggerLabel` name.
- From `breakpoint` up the menu is a `Popover` under the trigger (`bottom-start`), labelled by its heading. Below it the
  menu is a `Modal` with the full-screen phone layout below `sm` and the centred card from `sm`, headed by its title and
  a close button.
- `kind: 'app'` items render as tiles — icon, label and a one-line `description` — in one column, two from `sm`. The
  icon is `icon`, else the label's first character.
- `kind: 'site'` items render after a divider under the `sitesLabel` heading, as links that open a new tab
  (`rel="noopener noreferrer"`) with an external-link glyph and the `newTabLabel` screen-reader text.
- The item whose `key` is `current` renders as a button marked `aria-current="true"` that only closes the menu.
- Every other item renders as a link only when `href` is an absolute HTTPS URL without credentials, query or fragment;
  the menu drops any other item. Configured addresses cannot carry a token into another app's address bar.
- Picking a link emits `select` with the caller's item and the click, then closes the menu. The link's native
  navigation proceeds unless a listener calls `preventDefault()` — the hook for routing a same-origin app.
- Escape, an outside press and the dialog's close button close the menu; focus returns to the trigger. Opening moves
  focus into the panel — the first tile in the popover, the close button in the dialog.
- The menu closes when the viewport crosses `breakpoint`. The server and the first client render use the dialog, so
  hydration matches; the subtitle hides through CSS, so the first paint is already right.
- Strings resolve through the nearest `LocaleProvider` when their prop is omitted: `AppSwitcherMenu.title` (`Apps`),
  `.sitesLabel` (`Sites`), `.closeLabel` (`Close`), `.newTabLabel` (`(opens in a new tab)`) and `.triggerLabel`
  (`{app} — switch app`, with the `app` variable).
- Styling uses theme tokens only. `variant` picks the panels' surface recipe — `glass` for the SDK's translucent
  chrome — and `panelClass` adds an app's own material to both panels.
- Attributes and `class` land on the trigger button. Automatic attribute inheritance is disabled; the source
  explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `items` | `ReadonlyArray<T extends AppSwitcherItem>` | yes | — | Every destination, in display order. |
| `current` | `string` | yes | — | The key of the open app or site. |
| `label` | `string` | no | current item's label | The app name on the trigger. |
| `subtitle` | `string` | no | — | The trigger's second line — the organisation or workspace. |
| `open` | `boolean` | no | — | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. |
| `breakpoint` | `Breakpoint` | no | `md` | The popover shows from this breakpoint; the dialog below it. |
| `title` | `string` | no | locale `Apps` | The menu heading. |
| `sitesLabel` | `string` | no | locale `Sites` | The sites group heading. |
| `closeLabel` | `string` | no | locale `Close` | The dialog close button's name. |
| `newTabLabel` | `string` | no | locale `(opens in a new tab)` | The screen-reader text after each site link. |
| `triggerLabel` | `string` | no | locale `{app} — switch app` | The trigger's accessible name; `{app}` is the app name. |
| `variant` | `SurfaceVariant` | no | overlay default | The surface recipe of both panels. |
| `panelClass` | `HTMLAttributes['class']` | no | — | Extra classes on both panels. |

`AppSwitcherItem`: `key` · `label` · `description?` · `href` · `icon?: IconAdapter` · `kind: AppSwitcherKind`
(`app` · `site`). Labels and descriptions arrive translated.

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean]` | The menu opened or closed — the `v-model:open` half. |
| `select` | `select: [item: T, event: MouseEvent]` | The reader opened another app or site. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `mark` | `mark?(props: { current: T \| undefined }): unknown` | The brand mark at the trigger's start; default a grid glyph. |

## Exposed handle

`{ el }` — the trigger button. Read this through a component template ref after mount; the referenced DOM node may be
absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers
  render/SSR compatibility, not all interaction behavior.
- Focused test references: [AppSwitcherMenu.dom.test.ts](../../../../tests/unit/presentation/nav/AppSwitcherMenu.dom.test.ts),
  [AppSwitcherMenu.browser.test.ts](../../../../tests/unit/presentation/nav/AppSwitcherMenu.browser.test.ts). Consult
  the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the
  existence of this specification is not a passing-test claim.
