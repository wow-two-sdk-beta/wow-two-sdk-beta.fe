# SidebarMenu

Renders the app's vertical sidebar navigation — destinations, labelled sections and collapsible groups, with an icon-rail mode.

Source: [SidebarMenu.vue](SidebarMenu.vue) · [SidebarMenuItem.vue](SidebarMenuItem.vue) · [SidebarMenuGroup.vue](SidebarMenuGroup.vue) · [SidebarMenuSection.vue](SidebarMenuSection.vue) · [SidebarMenuContext.ts](SidebarMenuContext.ts).

Public import: `import { SidebarMenu, SidebarMenuItem, SidebarMenuGroup, SidebarMenuSection } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- The menu is a `<nav>` landmark over a `role="list"` list. Its name is the caller's `aria-label`, else the localized `SidebarMenu.label` (`'Sidebar'`).
- The menu holds links, not a menu widget: no roving focus; every destination and group toggle is one Tab stop.
- `isCollapsed` turns the menu into an icon rail. Icons stay in their leading slots, labels fade while keeping their
  accessible names, trailing content becomes inert, and section headings fade into dividers. Size the rail's width
  on the caller's container. Parts outside a `SidebarMenu` render expanded.
- Width, placement and scrolling belong to the caller (for example `AppShellSidebar`).
- Under a coarse pointer the menu keeps its box and padding; a caller must not add its own inline margin or padding
  under a coarse pointer, which would move the rail's icons (`## Touch`).

### SidebarMenuItem

- Renders `<li><a>` with an icon, a truncated label and a trailing slot. `isActive` sets `aria-current="page"` and `data-active` (tinted).
- The row is 36px, its content centred. Under a coarse pointer a horizontal hit area at least 44px wide
  (`CoarseHitArea.AfterX`) covers a rail row narrower than that, so its icon keeps its place. The row and the group
  toggle never clip their own overflow, under either pointer; the label truncates in its own span. Inside a drawer (`data-sidebar-drawer`) the row is 44px tall under a coarse pointer.
- `asChild` merges the row's classes and state onto the slotted router link. Mark the link's direct label child with
  `data-sidebar-menu-label` to use the same clipping and fade as the built-in label.
- The icon is `aria-hidden`; fallthrough attributes and `class` reach the link; the exposed `el` is the link element.

### SidebarMenuGroup

- A disclosure: the toggle row carries `aria-expanded` and `aria-controls`, and the nested list is named by `label`.
  The list animates in and out through `CollapsibleGroupContent` and stays mounted and inert when closed.
- `open` / `update:open` and `defaultOpen` follow the shared controlled-state helper. Open the group that holds the active route through `defaultOpen`.
- The toggle row takes a destination row's sizes and hit area: 36px, 44px tall in a drawer under a coarse pointer.
- In the rail a group shows only its toggle: the nested list stays hidden (`aria-expanded="false"`), and its open state applies once the menu expands.

### SidebarMenuSection

- An always-open list under a small heading, named by that heading through `aria-labelledby`.
- `label` is optional. Without it the section draws no heading row in either state and keeps its start padding in the
  rail, so its items keep their place when the menu collapses or expands; a first section without a label puts its
  first item on the nav's own padding in both states. Its list has no name.

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| row and group toggle in a drawer (`data-sidebar-drawer`: `AppFrame`'s phone and tablet drawers) | 36px → 44px tall, content centred | visible height |
| row and group toggle in a sidebar or rail | none: 36px rows with a horizontal-only hit area 44px wide | hit area |

- The sidebar and rail list is dense: its rows sit 2px apart, so a vertical hit area would take its neighbour's
  taps. Each row's vertical reach stays 36px, above the 24px of WCAG 2.5.8; a drawer, used by touch first, grows its
  rows to 44px instead.

## Props

| Prop          | Type      | Required | Default | Meaning                         |
| ------------- | --------- | -------- | ------- | ------------------------------- |
| `isCollapsed` | `boolean` | no       | `false` | Shows the menu as an icon rail. |

### SidebarMenuItem

| Prop       | Type      | Required | Default     | Meaning                                              |
| ---------- | --------- | -------- | ----------- | ---------------------------------------------------- |
| `isActive` | `boolean` | no       | `undefined` | Marks the current place.                             |
| `asChild`  | `boolean` | no       | `false`     | Renders the slotted router link instead of an `<a>`. |

### SidebarMenuGroup

| Prop          | Type      | Required | Default     | Meaning                                                 |
| ------------- | --------- | -------- | ----------- | ------------------------------------------------------- |
| `label`       | `string`  | yes      | —           | The toggle text and the nested list's name.             |
| `open`        | `boolean` | no       | `undefined` | The open state, controlled — the `v-model:open` target. |
| `defaultOpen` | `boolean` | no       | `false`     | The initial open state when uncontrolled.               |

### SidebarMenuSection

| Prop    | Type     | Required | Default | Meaning                                                           |
| ------- | -------- | -------- | ------- | ----------------------------------------------------------------- |
| `label` | `string` | no       | —       | The section heading and the list's name; omitted, no heading row. |

## Emits

| Part               | Event         | Signature                         | Meaning                                          |
| ------------------ | ------------- | --------------------------------- | ------------------------------------------------ |
| `SidebarMenuGroup` | `update:open` | `'update:open': [open: boolean];` | Fires when the reader opens or closes the group. |

## Slots

| Part                 | Slot       | Signature             | Meaning                                        |
| -------------------- | ---------- | --------------------- | ---------------------------------------------- |
| `SidebarMenu`        | `default`  | `default(): unknown`  | The items, groups and sections.                |
| `SidebarMenuItem`    | `default`  | `default(): unknown`  | The label, or the router link under `asChild`. |
| `SidebarMenuItem`    | `icon`     | `icon(): unknown`     | The leading icon.                              |
| `SidebarMenuItem`    | `trailing` | `trailing(): unknown` | The count or status dot; hidden in the rail.   |
| `SidebarMenuGroup`   | `default`  | `default(): unknown`  | The nested items.                              |
| `SidebarMenuGroup`   | `icon`     | `icon(): unknown`     | The toggle row's icon.                         |
| `SidebarMenuSection` | `default`  | `default(): unknown`  | The section's items and groups.                |

## Exposed handle

`SidebarMenuItem` exposes `{ el }` — the link element. `useSidebarMenuContext()` reads the rail state for custom parts.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [SidebarMenu.dom.test.ts](../../../../tests/unit/presentation/nav/SidebarMenu.dom.test.ts) — landmark and section names, current page, group disclosure (uncontrolled and controlled), the rail and localization.
