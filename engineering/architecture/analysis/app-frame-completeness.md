# App frame — vector completeness

*Last updated: 2026-11-10*

> Every capability an app frame integrates, with a verdict: ship-now, defer with a named trigger, or skip with a
> reason. Trigger: the Events integration (2026-11-10), where the developer asked for one bar, edges and account menu
> across every WoW2 console and Ocharo app. Sources: the eleven local frames (seven Ocharo apps, Wheelhouse, SCFD,
> Events, FSS). Adoption: [app-frame-migration.md](../app-frame-migration.md).

## Picks

Decided in the fe sdk lane, taken from Wheelhouse's frame where the consumers disagreed.

| Fork | Pick | Other option |
|---|---|---|
| Bar height | 56px, hairline included | 60px (five Ocharo apps) |
| Sidebar widths | 248px and 64px | 244px and 68px (Ocharo) |
| Collapse toggle | in the bar | the sidebar's foot (Ocharo) |
| Brand | a divided cell above the sidebar | inline in the bar (Ocharo) |
| Tablet | forced rail, drawer for the full navigation | rail by choice (SCFD) |
| Phone | bottom bar when the app passes one, else the drawer | one of the two for everyone |
| Page width | one cap, 1536px, plus `full` | a width per app (1400 to 1800px) |
| Frame dimensions | `--frame-*` custom properties, the same in every theme | a `Theme.frame` knob per theme |
| Account menu | the SDK `AccountMenu`, replaceable by slot | a second menu component |
| Router | none in the frame; `onNavigate` and link-click closing | a `vue-router` dependency in `presentation` |
| Running version | `useRunningVersion(load)`: the API's status call, else `version.json` | a build-time constant |

## Inventory

| Capability | Verdict | Where or when |
|---|---|---|
| Frame grid, bar, sidebar, page column | ship-now | `AppFrame` |
| Frame dimensions as tokens | ship-now | `--frame-*` in `styles.css` |
| Glass edges and layout lines for the platform theme | ship-now | `platform` theme `glass` |
| Brand cell and inline brand | ship-now | `brand` slot |
| App switcher in the brand cell | ship-now | `apps`; `AppSwitcherMenu` `isCompact` |
| Version badge that follows the running version | ship-now | `VersionBadge`, `useRunningVersion` |
| Sidebar collapse, persisted | ship-now | `collapseStorageKey`, `isCollapsedByDefault` |
| Tablet rail with a navigation drawer | ship-now | `AppFrame` |
| Phone drawer, or a bottom bar by slot | ship-now | `phone-nav` slot |
| Single-line trail | ship-now | `crumbs`; `Breadcrumb` `isSingleLine` |
| Account menu with models and extra rows | ship-now | `account`, `account-items` |
| Full-bleed page | ship-now | `contentWidth="full"` |
| Print layout | ship-now | `AppFrame` |
| Skip link, single `main`, landmarks | ship-now | inherited from `AppShell` |
| Frame state for descendants (`useAppFrame`) | defer | a nav or page that needs `isRail` without the slot prop |
| Router binding (`RouteAppFrame`: crumbs from route metadata, `router.push`) | defer | the second consumer that repeats the wiring |
| Data-driven navigation (`navigation` groups, the frame renders `SidebarMenu`) | defer | after three consumers adopt the `nav` slot unchanged |
| Bottom bar built from the same navigation data, with a More sheet | defer | with data-driven navigation |
| Page frames: empty, loading and error states with one look | defer | the Ocharo adoption; five apps carry a local error fallback |
| Page-actions outlet in the bar that wraps on a phone | defer | Wheelhouse's UI round |
| Account menu as a phone sheet | defer | Wheelhouse's UI round (`ProfileSheet`) |
| Environment or container switch as a bar control | defer | a second console with one; SCFD's stays in `bar-end` |
| Vite plugin: `version.json`, `__APP_VERSION__` and the pre-paint script | defer | the first app with no status call |
| App switcher categories, recents and icon-first tiles | defer | already in the backlog (Ocharo, 2026-11-03) |
| Keyboard: a shortcut for the toggle, focus order audit across the bar | defer | the next accessibility pass |
| Resizable sidebar | skip | one width is the point of the frame |
| Per-theme frame dimensions | skip | it would reopen the height and width drift this frame closes |
| Right-hand aside region in the frame | skip | `AppShellAside` inside the page covers it; no consumer has one |
| Nested or second-level sidebars | skip | no consumer; Wheelhouse unfolds inside one `SidebarMenu` |

## Known gaps

- `AppShellSidebar` still wraps the slot in a `nav` around `SidebarMenu`'s own landmark (backlog, fix).
- The frame has not been proven in a product; the Ocharo adoption is the proof.
