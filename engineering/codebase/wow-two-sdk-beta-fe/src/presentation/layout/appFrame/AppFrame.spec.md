# AppFrame

Renders the frame every app shares: the top bar, the collapsing sidebar and the page column, at one set of dimensions
whatever the theme. An app passes its brand, its navigation, its app list and its slots.

Source: [AppFrame.vue](AppFrame.vue).

Public import: `import { AppFrame } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- The frame composes `AppShell`: the bar, the sidebar and a phone's bottom bar hold still and the main region scrolls.
- Dimensions come from the `--frame-*` tokens in `styles.css`, the same in every theme: `--frame-bar-height` (56px,
  hairline included), `--frame-sidebar-width` (248px), `--frame-rail-width` (64px) and `--frame-content-max` (1536px).
  An app offsets its own chrome by them (`top-(--frame-bar-height)`); it does not redefine them.
- Edges are the theme's glass hairline (`border-glass-edge`, the border colour where a theme sets none): under the bar,
  between the brand cell and the bar, and beside the sidebar. `variant="glass"` paints the bar and sidebar with the
  theme's glass and its shadow over `surface-ambient`; `solid` paints them on the card colour.
- The bar reads, in order: the brand, the sidebar toggle, `bar-start`, the trail, `bar-end`, the account menu. The
  bar adds the device's top inset above its 56px.
- From `md` up, with a sidebar, the brand sits in a cell above it, as wide as it and divided from the bar by a
  hairline. On a phone, and in a frame without a sidebar, the brand sits inline at the bar's start.
- The header cell and sidebar share `--frame-sidebar-size`. It interpolates on desktop and settles immediately
  with reduced motion. Content that needs the current width can read this property. Use `isRail` for the target
  state and keep marks in fixed leading slots in custom brand and navigation content.
- The brand is the `brand` slot, which receives `isRail`: true where only the mark fits (above the rail, in a phone's
  bar). With `apps` the brand is an `AppSwitcherMenu` whose mark is the `brand` slot; it turns compact where `isRail`.
- `version` shows as a `VersionBadge` beside the brand, hidden where `isRail`. With `runningVersion` the badge follows
  the release the host serves and offers a reload when the tab is behind; `onReload` replaces the page reload.
  The brand keeps its own width and the badge takes what the cell has left: a version too long for it ends in an
  ellipsis with the full text on the badge's title, so the cell never clips the badge.
- The sidebar holds the `nav` slot. At `lg` and wider the reader collapses it to the icon rail with the toggle, and
  the choice persists in `localStorage` under `collapseStorageKey`. Between `md` and `lg` it is always the rail and
  the toggle opens the full navigation in a drawer. Below `md` there is no sidebar: the toggle opens the drawer,
  unless the `phone-nav` slot supplies a bottom bar, in which case the toggle hides.
- The `nav` slot receives `isRail` and `close`. A click on any link inside it closes the drawer. Growing to `lg`
  closes it too.
- The toggle is a button named `collapseLabel`, `expandLabel` or `openNavigationLabel` by what it does, with
  `aria-expanded` for the sidebar or the drawer. It is a 40 x 40px `Button` whose hit area reaches 44 x 44px under a
  coarse pointer while the box keeps its size, so the trail beside it does not move; the bar stays 56px.
- `crumbs` render as a single-line `Breadcrumb` named `trailLabel`; a plain string is an item without a link. With
  `onNavigate`, a plain left click on a link whose `href` starts
  with one `/` is handed to the app's router; modified clicks and other origins keep the browser's behaviour. The
  `trail` slot replaces the breadcrumb.
- `account` renders the SDK `AccountMenu` at the bar's end, with the `account-items` slot as its destinations; the
  frame binds `accountOpen`, `locale` and `organization` as models. The `account` slot replaces the menu.
- `contentWidth="default"` wraps the page in the shared column: the widening gutter, equal on all four sides
  (12px, 24px from `sm`, 32px from `xl`), capped at
  `--frame-content-max` or at the app's own `contentMaxWidth`. `full` hands the page the whole main region: no
  gutter, no cap, a flex column that is the only scroller. `notice` renders above the page in both.
- `nav-footer` renders at the sidebar's foot and the drawer's, under a hairline, and receives `isRail`.
- `barClass`, `sidebarClass`, `mainClass` and `contentClass` add classes to their regions; the regions also carry
  `data-app-frame-bar`, `-brand`, `-row`, `-toggle`, `-nav-footer` and `-phone-nav` for an app's own CSS.
- Without a `nav` slot, or with `hasNavigation` false, the frame has no sidebar, no brand cell and no toggle.
- Print hides the bar, the sidebar and the bottom bar and lets the page flow.
- Strings resolve through the nearest `LocaleProvider` when their prop is omitted: `AppFrame.collapseLabel`
  (`Collapse sidebar`), `.expandLabel` (`Expand sidebar`), `.openNavigationLabel` (`Open navigation`) and
  `.navigationLabel` (`Navigation`). `versionLabel`, `versionUpdateLabel`, `trailLabel` and `skipToContentLabel`
  override the badge's, the breadcrumb's and the skip link's own localized strings, so an app without a
  `LocaleProvider` passes every string as a prop.
- The server and the first client render use the phone layout, then the frame adopts the viewport on mount.
- The phone layout follows `isPhone` when given, else the device class an app root provided with
  `provideDeviceTargets` (phone when its effective class is phone, so a landscape phone or a product that declares no
  tablet is served the phone layout at `md` and wider), else the viewport (phone below `md`). `true` forces the phone
  layout at any width, with the sidebar collapsed to its drawer and never a desktop; `false` forces it off, so the
  sidebar stays beside the page as the rail even in a narrow viewport. The frame reads the provided class with
  `inject` and never throws without one.
- In the phone layout the bar hides while the reader scrolls the main region down and returns on any scroll up
  (`useHideOnScroll` from `foundation/dom`): 8px of travel down more than 64px from the top hides it, 8px up or a
  return within 64px of the top reveals it, and only a page taller than its view by more than the bar plus 64px, as
  if the bar shows, hides it at all. Focus moving into the bar reveals it; `scrollToTop` and `revealBar` reveal it
  too. `canHideBarOnScroll` false keeps it; outside the phone layout it never hides.
- While the bar may hide it is `relative` instead of `sticky` (the region shell never scrolls, so `sticky` would pin a
  hidden bar on screen) and eases its top margin over 200ms, instantly with reduced motion. Hidden, it carries
  `data-bar-hidden` and a negative top margin of its own height plus the top inset, which collapses its auto grid row
  so the page grows into the space. `barClass` merges last and wins over these classes.
- Attributes and `class` land on the frame root. Automatic attribute inheritance is disabled; the source explicitly
  forwards and merges supported fallthrough attributes.
- Under a coarse pointer a link in the brand slot takes the tap across an invisible 44 x 44px area centred on it (a
  `::after` scoped to the slotted link, as `CoarseHitArea`), while the link and its mark keep their size and place —
  in the rail the mark stays at the rail's centre. The frame makes the link `relative` and takes its `::after`. The app
  switcher's trigger already reaches 44px.

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| brand link, sidebar toggle | none: invisible 44px hit areas | hit area |
| sidebar navigation in the phone and tablet drawers | marked `data-sidebar-drawer`, so `SidebarMenu` rows are 44px tall there | visible height |

- The scroll region always scrolls (`overflow-y: scroll`) and contains its overscroll (`overscroll-behavior-y:
  contain`); the page around it takes `overscroll-behavior: none` (`index.css`). Under either pointer the layout is the
  same: WebKit, which ignores `scrollbar-gutter`, keeps the gutter, and no rubber band moves the shell.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `version` | `string` | no | — | The version this tab loaded; shown beside the brand. |
| `runningVersion` | `string \| null` | no | — | The version the host serves now. |
| `onReload` | `() => unknown` | no | page reload | Runs when the reader asks for the newer release. |
| `crumbs` | `ReadonlyArray<BreadcrumbItem \| string>` | no | `[]` | The trail to the current place. |
| `trailLabel` | `string` | no | locale `Breadcrumb` | The trail landmark's accessible name. |
| `onNavigate` | `(href: string, event: MouseEvent) => unknown` | no | — | Opens a trail link through the app's router. |
| `apps` | `ReadonlyArray<AppSwitcherItem>` | no | — | The suite's apps and sites; makes the brand a switcher. |
| `currentApp` | `string` | no | — | The key of this app among `apps`. |
| `appLabel` | `string` | no | current app's label | The app name on the switcher. |
| `appSubtitle` | `string` | no | — | The switcher's second line. |
| `appSwitcher` | `AppFrameSwitcher` | no | — | The switcher's own strings and breakpoint. |
| `account` | `AppFrameAccount` | no | — | The account menu's props, without its three models. |
| `accountOpen` | `boolean` | no | — | The account menu's open state. The `v-model:accountOpen` target. |
| `locale` | `string` | no | — | The interface language. The `v-model:locale` target. |
| `organization` | `string` | no | — | The current organization's id. The `v-model:organization` target. |
| `hasNavigation` | `boolean` | no | `nav` slot present | Whether the frame has a sidebar. |
| `collapseStorageKey` | `string` | no | `wow-two.app-frame.sidebar-collapsed` | Where the collapse persists; read once. |
| `isCollapsedByDefault` | `boolean` | no | `false` | Whether the desktop sidebar starts as the rail. |
| `isPhone` | `boolean` | no | provided device class, else viewport | Serves the phone layout; `true` forces it at any width, `false` forces it off. |
| `canHideBarOnScroll` | `boolean` | no | `true` | Whether the phone layout's bar hides while the page scrolls down. |
| `contentWidth` | `AppFrameContentWidth` | no | `default` | `default` for the shared column, `full` for edge to edge. |
| `contentMaxWidth` | `ContainerLayoutSize \| SizeValue` | no | `--frame-content-max` | The page column's cap. |
| `barClass` | `HTMLAttributes['class']` | no | — | Extra classes on the bar. |
| `sidebarClass` | `HTMLAttributes['class']` | no | — | Extra classes on the sidebar. |
| `mainClass` | `HTMLAttributes['class']` | no | — | Extra classes on the main region. |
| `contentClass` | `HTMLAttributes['class']` | no | — | Extra classes on the page column. |
| `variant` | `AppFrameVariant` | no | `glass` | The chrome's surface: `glass` or `solid`. |
| `collapseLabel` | `string` | no | locale `Collapse sidebar` | The toggle's name while the sidebar is open. |
| `expandLabel` | `string` | no | locale `Expand sidebar` | The toggle's name while the sidebar is the rail. |
| `openNavigationLabel` | `string` | no | locale `Open navigation` | The toggle's name where it opens the drawer. |
| `navigationLabel` | `string` | no | locale `Navigation` | The drawer's accessible title. |
| `versionLabel` | `string` | no | locale `Version {version}` | The version badge's tooltip. |
| `versionUpdateLabel` | `string` | no | locale | The stale badge's name; `{version}` loaded, `{running}` served. |
| `skipToContentLabel` | `string` | no | locale `Skip to content` | The skip link's text. |

`AppFrameAccount` is `AccountMenuProps` without `open`, `defaultOpen`, `locale` and `organization`. `AppFrameSwitcher`
is `title`, `sitesLabel`, `closeLabel`, `newTabLabel`, `triggerLabel` and `breakpoint` of `AppSwitcherMenuProps`.

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:accountOpen` | `'update:accountOpen': [open: boolean]` | The account menu opened or closed. |
| `update:locale` | `'update:locale': [locale: string]` | The reader picked another interface language. |
| `update:organization` | `'update:organization': [organization: string]` | The reader picked another organization. |
| `collapse` | `collapse: [isCollapsed: boolean]` | The reader collapsed or expanded the desktop sidebar. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | The page. |
| `brand` | `brand?(props: { isRail: boolean }): unknown` | The home link and mark; the switcher's mark with `apps`. |
| `nav` | `nav?(props: { isRail: boolean; close: () => void }): unknown` | The sidebar's navigation. |
| `nav-footer` | `'nav-footer'?(props: { isRail: boolean }): unknown` | What stands at the sidebar's foot. |
| `bar-start` | `'bar-start'?(): unknown` | Controls between the toggle and the trail. |
| `trail` | `trail?(): unknown` | Replaces the breadcrumb. |
| `bar-end` | `'bar-end'?(): unknown` | The app's own bar controls, before the account menu. |
| `account` | `account?(): unknown` | Replaces the account menu. |
| `account-items` | `'account-items'?(): unknown` | The account-level destinations inside the account menu. |
| `phone-nav` | `'phone-nav'?(): unknown` | A phone's bottom bar, below `md`. |
| `notice` | `notice?(): unknown` | What stands above every page. |

## Exposed handle

`{ el, mainEl, isRail, isCollapsed, isBarHidden, toggleSidebar, closeNavigation, scrollToTop, revealBar }` — the
frame root, the scrolling main region, the rail state, the persisted collapse, whether the phone bar is hidden and
the four actions; `scrollToTop` also reveals the bar, and `revealBar` reveals it alone (on a route change, say). Read
this through a component template ref after mount; the referenced DOM nodes may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This
  covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [AppFrame.dom.test.ts](../../../../tests/unit/presentation/layout/AppFrame.dom.test.ts),
  [AppFrame.browser.test.ts](../../../../tests/unit/presentation/layout/AppFrame.browser.test.ts). Consult the named
  test assertions for the behavior actually covered.
- Showcase: the atlas's `#/shell` page ([ShellPage.vue](../../../../apps/atlas/src/pages/ShellPage.vue)) renders the
  frame in the default, `platform` and `ocharo` themes, light and dark.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the
  existence of this specification is not a passing-test claim.
