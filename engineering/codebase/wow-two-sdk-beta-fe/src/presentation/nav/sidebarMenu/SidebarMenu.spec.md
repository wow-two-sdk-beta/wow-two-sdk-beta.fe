# SidebarMenu

Renders the app's vertical sidebar navigation — destinations, labelled sections and collapsible groups, with an icon-rail mode.

Source: [SidebarMenu.vue](SidebarMenu.vue) · [SidebarMenuItem.vue](SidebarMenuItem.vue) · [SidebarMenuGroup.vue](SidebarMenuGroup.vue) · [SidebarMenuSection.vue](SidebarMenuSection.vue) · [SidebarMenuContext.ts](SidebarMenuContext.ts).

Public import: `import { SidebarMenu, SidebarMenuItem, SidebarMenuGroup, SidebarMenuSection } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- The menu is a `<nav>` landmark over a `role="list"` list. Its name is the caller's `aria-label`, else the localized `SidebarMenu.label` (`'Sidebar'`).
- The menu holds links, not a menu widget: no roving focus; every destination and group toggle is one Tab stop.
- `isCollapsed` turns the menu into an icon rail: labels become assistive-only text, trailing counts and group chevrons drop, and sections become dividers. Size the rail's width on the caller's container. Parts outside a `SidebarMenu` render expanded.
- Width, placement and scrolling belong to the caller (for example `AppShellSidebar`).

### SidebarMenuItem

- Renders `<li><a>` with an icon, a truncated label and a trailing slot. `isActive` sets `aria-current="page"` and `data-active` (tinted).
- `asChild` merges the row's classes and state onto the slotted router link. The link owns its label, so the rail cannot hide it; make it assistive-only yourself.
- The icon is `aria-hidden`; fallthrough attributes and `class` reach the link; the exposed `el` is the link element.

### SidebarMenuGroup

- A disclosure: the toggle row carries `aria-expanded` and `aria-controls`, and the nested list is named by `label`. Closed lists stay in the DOM, hidden.
- `open` / `update:open` and `defaultOpen` follow the shared controlled-state helper. Open the group that holds the active route through `defaultOpen`.
- In the rail a group shows only its toggle: the nested list stays hidden (`aria-expanded="false"`), and its open state applies once the menu expands.

### SidebarMenuSection

- An always-open list under a small heading, named by that heading through `aria-labelledby`.

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

| Prop    | Type     | Required | Default | Meaning                                  |
| ------- | -------- | -------- | ------- | ---------------------------------------- |
| `label` | `string` | yes      | —       | The section heading and the list's name. |

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
