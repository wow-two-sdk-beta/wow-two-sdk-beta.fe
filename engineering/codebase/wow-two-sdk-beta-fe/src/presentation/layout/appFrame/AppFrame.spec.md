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
- The brand is the `brand` slot, which receives `isRail`: true where only the mark fits (above the rail, in a phone's
  bar). With `apps` the brand is an `AppSwitcherMenu` whose mark is the `brand` slot; it turns compact where `isRail`.
- `version` shows as a `VersionBadge` beside the brand, hidden where `isRail`. With `runningVersion` the badge follows
  the release the host serves and offers a reload when the tab is behind; `onReload` replaces the page reload.
- The sidebar holds the `nav` slot. At `lg` and wider the reader collapses it to the icon rail with the toggle, and
  the choice persists in `localStorage` under `collapseStorageKey`. Between `md` and `lg` it is always the rail and
  the toggle opens the full navigation in a drawer. Below `md` there is no sidebar: the toggle opens the drawer,
  unless the `phone-nav` slot supplies a bottom bar, in which case the toggle hides.
- The `nav` slot receives `isRail` and `close`. A click on any link inside it closes the drawer. Growing to `lg`
  closes it too.
- The toggle is a button named `collapseLabel`, `expandLabel` or `openNavigationLabel` by what it does, with
  `aria-expanded` for the sidebar or the drawer.
- `crumbs` render as a single-line `Breadcrumb` named `trailLabel`; a plain string is an item without a link. With
  `onNavigate`, a plain left click on a link whose `href` starts
  with one `/` is handed to the app's router; modified clicks and other origins keep the browser's behaviour. The
  `trail` slot replaces the breadcrumb.
- `account` renders the SDK `AccountMenu` at the bar's end, with the `account-items` slot as its destinations; the
  frame binds `accountOpen`, `locale` and `organization` as models. The `account` slot replaces the menu.
- `contentWidth="default"` wraps the page in the shared column: the widening gutter, capped at
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
- Attributes and `class` land on the frame root. Automatic attribute inheritance is disabled; the source explicitly
  forwards and merges supported fallthrough attributes.

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

`{ el, mainEl, isRail, isCollapsed, toggleSidebar, closeNavigation, scrollToTop }` — the frame root, the scrolling
main region, the rail state, the persisted collapse and the three actions. Read this through a component template ref after mount; the
referenced DOM nodes may be absent while unmounted.

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
