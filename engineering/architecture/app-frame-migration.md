# App frame migration

*Last updated: 2026-11-10*

> How a consumer replaces its local `bootstrap/AppLayout.vue` frame with the fe sdk `AppFrame`.
> Contract: [AppFrame.spec.md](../codebase/wow-two-sdk-beta-fe/src/presentation/layout/appFrame/AppFrame.spec.md).
> What is left to build: [app-frame-completeness.md](analysis/app-frame-completeness.md).
> Order (developer, 2026-11-10): Ocharo's seven apps first, then the consoles in their own UI rounds.

## What the frame fixes

| Part | Value | Was |
|---|---|---|
| Bar height | `--frame-bar-height`, 56px with its hairline | a 60px row in five Ocharo apps; a 56px row plus the hairline in Wheelhouse and SCFD |
| Sidebar, open and rail | `--frame-sidebar-width` 248px, `--frame-rail-width` 64px | 244px and 68px in Ocharo |
| Page column | gutter `lg` with `lg:px-6 xl:px-8`, capped at `--frame-content-max` 1536px unless the app passes `content-max-width` | 1400 to 1800px in Ocharo |
| Edges | the theme's `--glass-edge` hairline under the bar, beside the brand cell and the sidebar | local `--wh-glass-edge`, `border-border` |
| Brand | a cell above the sidebar, as wide as it; inline on a phone | inline switcher in Ocharo |
| Collapse toggle | in the bar, after the brand | the sidebar's foot in Ocharo |
| Tablet (`md` to `lg`) | the rail, and the toggle opens the navigation in a drawer | no control in Ocharo; rail by choice in SCFD |
| Phone | the `phone-nav` bottom bar, else the toggle opens the drawer | per app |
| Account menu | the SDK `AccountMenu`, last in the bar | a local `ProfileMenu` in Wheelhouse |
| Version | a `VersionBadge` beside the brand that follows the running version | a build-time constant |
| Print | the bar, sidebar and bottom bar hide; the page flows | local print CSS in Brand and Catalogue |

A consumer keeps its theme class (`theme-ocharo`, `theme-platform`), its fonts and colours, its `ColorModeProvider`
and pre-paint script, its routes and everything inside the page.

---

## Running version

The badge compares two values: `version`, the build-time constant the tab loaded, and `runningVersion`, what the host
serves now.

- Source where the app and its API ship in one image (every console, every Ocharo app): the API's status call the
  app already makes.
- Source for an app with no API of its own: a `version.json` beside `index.html`, written at build from the same
  `APP_VERSION`, read with `cache: 'no-store'`.
- `useRunningVersion(load)` reads on mount, every five minutes while the tab is visible, and at once when the tab
  returns; a failed read keeps the last answer.

```ts
import { useRunningVersion } from '@wow-two-beta/fe/foundation/net';

const { version: runningVersion } = useRunningVersion(async () => (await api.status()).version);
// No API: useRunningVersion(async () => (await (await fetch('/version.json', { cache: 'no-store' })).json()).version)
```

---

## An Ocharo app

Applies to Desk, Brand, Catalogue, Marketing, Editorial, Studio and Assets. Pin `@wow-two-beta/fe` to the release
that carries `AppFrame`; all seven sit on `0.0.42`, so no other breaking change is crossed.

### Delete

- From `bootstrap/AppLayout.vue`: `SidebarWidth`, the `usePersistentState` collapse, `useBreakpoint`, `isDesktop`,
  `isRail`, `sidebarWidth`; the `AppShell`, `AppShellHeader`, row `div`, `AppShellSidebar`, `AppShellMain` and
  `AppShellContent` markup; the inline `AppSwitcherMenu` with its chevron and `max-sm:` class strings; the version
  `span`; the local crumb `nav`; the inline `AccountMenu`.
- Desk's `presentation/frame/OcharoAppsMenu.vue`.
- From each `presentation/frame/*Nav.vue`: the foot block with the collapse button, the `can-toggle` prop and the
  `toggle` emit. Studio's "Studio home" row stays inside its nav.
- From each `PhoneNav.vue`: `[grid-area:footer]`, `md:hidden`, `z-sticky` and `no-print`; the frame's slot owns them.
- Studio's `:root { --frame-bar-height: 56px }` in `bootstrap/styles/frame.css`; the SDK token has the same name and
  value, so `.studio-toasts` and `.material-browser-list` keep working.
- Brand's and Catalogue's `@media print` rules for `.brand-frame` / `.catalogue-frame`; keep `.no-print` for their
  own notices.

### Pass

| Prop or slot | Value |
|---|---|
| `version` | `__APP_VERSION__` |
| `running-version` | `useRunningVersion` over the app's status read (`useBuildIdentity`, `useServiceVersion`) |
| `apps`, `current-app`, `app-label` | the app's `AppSwitcherItem` list, its key, its translated name |
| `app-subtitle` | `"Ocharo"`; Desk passes the organization's name |
| `app-switcher` | `{ title: t('Ocharo apps'), sitesLabel: t('Public sites'), closeLabel, newTabLabel, triggerLabel }` |
| `crumbs` | the same translated strings; an item as `{ label, href }` with `@navigate="router.push"` becomes a link |
| `account` | the identity object, plus `versions`, `locales`, `organizations`, `isBusy` |
| `v-model:account-open`, `v-model:locale`, `@update:organization` | as bound on `AccountMenu` today |
| `collapse-storage-key` | the app's existing key (`ocharo.desk.sidebar-collapsed`, …), so readers keep their choice |
| `is-collapsed-by-default` | Studio only |
| `has-navigation` | Desk only: `hasSections` |
| `content-width="full"` | Studio and Assets |
| `content-max-width` | only where a page needs another cap than 1536px: Brand `1400`, Marketing and Editorial `1600`, Catalogue `1800` |
| `bar-class`, `sidebar-class`, `main-class`, `content-class` | the app's own hooks: `no-print`, Studio's `studio-main [scrollbar-gutter:auto]` |
| `trail-label`, `skip-to-content-label`, `version-label`, `version-update-label` | translated strings, where the app has no `LocaleProvider` |
| `#brand` | `<span class="oc-mark">O</span>` |
| `#nav="{ isRail }"` | the app's `*Nav` with `:collapsed="isRail"` |
| `#nav-footer="{ isRail }"` | Studio's "Studio home" row |
| `#bar-end` | the app's own controls: Refresh, New post, New story, `NotificationsMenu` |
| `#trail` | Studio only: its `#studio-frame-bar` portal target |
| `#account-items` | Desk's "Account settings", Studio's two rows |
| `#phone-nav` | the app's `PhoneNav` |
| `#notice` | notices and connection banners |
| default slot | the error boundary and `RouterView` |

```vue
<AppFrame
  :version="appVersion"
  :running-version="runningVersion"
  :apps="items"
  current-app="brand"
  :app-label="t('Brand')"
  app-subtitle="Ocharo"
  :crumbs="crumbs"
  :account="account"
  v-model:account-open="accountOpen"
  collapse-storage-key="ocharo.brand.sidebar-collapsed"
>
  <template #brand><span class="oc-mark">O</span></template>
  <template #nav="{ isRail }"><BrandNav :current="section" :collapsed="isRail" /></template>
  <template #bar-end><Button variant="outline" @click="brand.refresh">{{ t('Refresh') }}</Button></template>
  <template #phone-nav><PhoneNav :current="section" /></template>
  <template #notice><IdentityConnection /></template>
  <AppErrorBoundary><RouterView /></AppErrorBoundary>
</AppFrame>
```

### What changes on screen

1. The bar drops from 60px to 56px in Desk, Brand, Catalogue, Marketing and Editorial.
2. The sidebar is 248px open and 64px as the rail, from 244px and 68px.
3. The app switcher and the version move into the cell above the sidebar; the version becomes a badge, and Desk
   gains one.
4. The collapse control moves from the sidebar's foot to the bar. On a tablet it opens the full navigation in a
   drawer; on a phone it shows only where the app passes no bottom bar.
5. The page width defaults to 1536px; Brand, Catalogue, Marketing and Editorial keep theirs with
   `content-max-width`, or take the default. Vertical padding is the SDK gutter (`py-6 lg:py-8`), where the apps
   had `pt-6 pb-12`.
6. The trail is the SDK `Breadcrumb` on one line; a phone shows its last two items, where the apps hid it.
7. Studio's phone section menu can go: the toggle opens the same sections in the drawer.
8. Assets gains the glass bar and safe-area padding; `variant="solid"` keeps the opaque one.

### Ocharo's 27 needs

Source: `ocharo-platform` `engineering/research/shell-adoption.md` #1 (`22d6699`). "0.0.43" is the release that
introduced the frame; "options" is the first release after `0.0.44`.

| # | Need | Answer | In |
|---|---|---|---|
| 1 | No sidebar, or one absent at runtime | omit `#nav`, or `:has-navigation="false"`; it reacts at runtime | 0.0.43 |
| 2 | A bare public bar | `#brand` and `#bar-end` only: no `apps`, no `account`, no `#nav` | 0.0.43 |
| 3 | Collapse under the app's key and default | `collapse-storage-key`, `is-collapsed-by-default`; read as the frame is created; rail forced below `lg`; no sidebar below `md`. A value `usePersistentState` stored reads back unchanged | 0.0.43 |
| 4 | Bar height and sidebar widths as CSS variables | `--frame-bar-height`, `--frame-sidebar-width`, `--frame-rail-width` | 0.0.43 |
| 5 | Content width per app; a full-bleed main | `content-max-width`; `content-width="full"` | options; 0.0.43 |
| 6 | The active nav item set by the app | `#nav` is the app's own `SidebarMenu`; `is-active` per item | 0.0.43 |
| 7 | Nav items as router links | `SidebarMenuItem as-child` around `RouterLink` | 0.0.43 |
| 8 | A trailing badge per nav item | `SidebarMenuItem` `#trailing`, hidden in the rail | 0.0.43 |
| 9 | An external nav item | an anchor item in `#nav` | 0.0.43 |
| 10 | Ungrouped items, a headingless group, a sidebar footer | `#nav` content; `#nav-footer` | 0.0.43; options |
| 11 | A phone bottom bar with a More sheet | `#phone-nav` holds the app's `PhoneNav`; an SDK-built bar is deferred | 0.0.43 |
| 12 | A phone top-bar menu instead | declined as a frame mode, see below | — |
| 13 | An account menu without sign-out; an anonymous one | `account` without `onSignOut`; `anonymousTriggerLabel`, `menuLabel` | 0.0.43 |
| 14 | An account-menu items slot | `#account-items` | 0.0.43 |
| 15 | Organizations with `update:organization` | `account.organizations`, `v-model:organization` | 0.0.43 |
| 16 | Sign-out as the app's handler, which may refuse | `account.onSignOut`; the frame never navigates | 0.0.43 |
| 17 | The account menu's open state as a model | `v-model:account-open` | 0.0.43 |
| 18 | Versions as the app's rows | `account.versions`; `version` beside the brand is optional | 0.0.43 |
| 19 | Three bar regions, the middle mounted first | `#bar-start`, `#trail`, `#bar-end`; `#trail` mounts with the frame, before the page | 0.0.43 |
| 20 | A breadcrumb of plain strings, optional | `crumbs` takes strings; omit it to show none | options |
| 21 | A slot above the page; the app's own page wrapper | `#notice`; the default slot | 0.0.43 |
| 22 | The main scroll container, or scroll-to-top | the exposed `mainEl`; `scrollToTop()` | 0.0.43; options |
| 23 | Print | the bar, sidebar and bottom bar hide; the frame flows | 0.0.43 |
| 24 | Every string as a prop; no required language picker | the four label props, `app-switcher`, `account`; `version-label`, `version-update-label`, `trail-label`, `skip-to-content-label` | 0.0.43; options |
| 25 | An optional app switcher; the app's subtitle | omit `apps`; `app-subtitle` | 0.0.43 |
| 26 | The colour-mode key and pre-paint script stay the app's | the frame touches neither | 0.0.43 |
| 27 | Safe-area top inset; a class on every region | built in; `bar-class`, `sidebar-class`, `main-class`, `content-class` | 0.0.43; options |

Kept unified, with the app that adapts:

- Bar height 56px: Desk, Brand, Catalogue, Marketing and Editorial drop from 60px.
- Sidebar 248px and 64px: all six sidebar apps move from 244px and 68px. Studio re-checks its container-query
  breakpoints: its page is 4px narrower beside the open sidebar and 4px wider beside the rail.
- The collapse control in the bar: all six navs drop their foot button.
- Phone navigation without a bottom bar is the drawer (#12): Studio drops `StudioSectionMenu`, or keeps it in
  `#bar-start` beside the toggle.
- The trail shows on a phone, its last two items: five apps hid it below `md`.
- The version badge beside the brand: Desk gains it, as the shell convention asks; omitting `version` hides it.

Deferred: a bottom bar the SDK builds from navigation data, with its More sheet (#11). `#phone-nav` carries each
app's own `PhoneNav` until Brand and Catalogue have adopted and the shared shape is proven.

Not unified by the frame, and Ocharo's to settle: the heading font (sans in Desk, Georgia elsewhere), page heading
sizes, card radii in Studio, and the language picker missing from Brand and Studio (`account.locales`).

---

## A console

Applies to SCFD, Events, Wheelhouse and FSS, each in its own UI round.

### SCFD (fe `0.0.41`)

- Delete from `bootstrap/AppLayout.vue`: the shell markup, `SidebarWidth`, `versionLabel`, `toggleSidebar`,
  `follow`, the `drawerOpen` watch; delete `application/preferences/UseSidebarCollapsed.ts`.
- Pass `version`, `running-version` (from `useSystemStatus`), `crumbs`, `@navigate="router.push"`, `account`
  (the `ConsoleAccount` fields plus `versions`), `collapse-storage-key="scfd.sidebar-collapsed"`.
- Slots: `#brand="{ isRail }"` the logo link, `#nav="{ isRail }"` `ConsoleNav`, `#bar-end` `ContainerSwitch`,
  `#notice` the demo notice; the default slot keeps `RoutePageHeader`, `ConsoleNotices` and the page.
- `ConsoleNav`'s `navigate` emit can go: a link click closes the drawer.
- On screen: the bar and its edges take Wheelhouse's glass from `theme-platform`; a tablet is always the rail.

### Wheelhouse (fe `0.0.38`)

- The pin crosses `0.0.41`, which renamed the BFF routes and sign-in helpers; Wheelhouse signs in through GitHub, so
  check its imports from `@wow-two-beta/fe/auth` first.
- Delete from `bootstrap/AppLayout.vue`: the shell markup, the brand cell, the version badge, the toggle,
  `SidebarWidth`, the header's `border-(--wh-glass-edge)` and `shadow-(--wh-glass-shadow)`; delete `NavDrawer.vue`.
- `theme-platform` now carries the frame glass: `--wh-glass-color`, `-edge`, `-highlight` and `-shadow` equal
  `--glass-fill`, `--glass-edge`, `--glass-highlight` and `--glass-shadow`. `wh-glass` on `PhoneNav` and `Panel`
  becomes `surface-glass border-glass-edge`; `-subtle`, `-sheen` and the map tokens stay local.
- Pass `version`, `running-version` (`useApiConnection().version`),
  `collapse-storage-key="wheelhouse.sidebar-collapsed"`.
- Slots: `#brand="{ isRail }"` `BrandMark` or `BrandWordmark` in the home link, `#nav="{ isRail }"` `ConsoleNav`,
  `#trail` `ScopeBar` (it keeps the product icons and the page-actions outlet), `#bar-end` the "Local server" badge,
  `#account` the local `ProfileMenu` until it moves to `account` plus `#account-items`, `#phone-nav` `PhoneNav`,
  `#notice` `SelfDeploymentNotice`.
- On screen: the bar is a fixed 56px, so page actions no longer wrap under the trail on a phone; they move into the
  page below `md`. The stale-version badge replaces the mismatch between the badge and the update banner.

### Events (fe `0.0.42`)

- Replace `presentation/console/components/ConsoleShell.vue` with a `bootstrap/AppLayout.vue` on `AppFrame`, mounted
  through a layout route; signed-out and loading screens render outside the frame.
- Add `class="theme-platform"` to `index.html`, import `themes.css`, mount `ColorModeProvider` and the pre-paint script.
- The five text links become a `SidebarMenu` in `#nav`; the catalog `select` goes to `#bar-end`; the locale `select`
  becomes `account.locales`; "Sign out" becomes `account.onSignOut`; the footer's version badges become `version` and
  `account.versions`.

### FSS (fe `0.0.32`)

- The pin crosses every breaking release since `0.0.32`; move the pin first, in its own commit.
- Add `bootstrap/AppLayout.vue` on `AppFrame` with two destinations (Console, File icons), the theme class,
  `ColorModeProvider` and the pre-paint script.

---

## Breaking changes in this release

- `theme-platform` gains glass tokens (`--glass-fill`, `--glass-side-fill`, `--glass-blur`, `--glass-edge`,
  `--glass-highlight`, `--glass-shadow`, `--glass-bottom-shadow`). Every `variant="glass"` surface under it changes
  from the SDK's default glass to Wheelhouse's: a `Card variant="glass"`, a glass header, a glass bottom bar.
- No export was removed or renamed. `AppSwitcherMenu` gains `isCompact`, `Breadcrumb` gains `isSingleLine`,
  `AppShell` gains `skipToContentLabel`.
- `0.0.44`: `BffOrganization` gains `name` and `slug` (`string | null`), so a hand-built `BffUser` adds both.
- New exports: `AppFrame`, `AppFrameContentWidth`, `AppFrameVariant` (`presentation/layout`); `VersionBadge`
  (`presentation/display`); `useRunningVersion` (`foundation/net`); the `--frame-*` custom properties (`styles.css`).
