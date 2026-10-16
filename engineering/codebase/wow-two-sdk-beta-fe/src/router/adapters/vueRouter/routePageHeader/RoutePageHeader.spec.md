# RoutePageHeader

Renders a `PageHeader` whose title and description follow the current route.

Source: [RoutePageHeader.vue](RoutePageHeader.vue).

Public import: `import { RoutePageHeader } from '@wow-two-beta/ui-vue/router';`.

## Contract

- The title is the deepest matched `handle.title` (literal or resolver); the description is the deepest
  `handle.description`, else the resolved `handle.meta.description`.
- A `title` / `description` prop or slot overrides the route value.
- Everything else — props, slots, the `PageHeaderActions` outlet — is `PageHeader`'s.
- Requires an installed vue-router; mount it in the layout that wraps the routed pages.

## Props

Props follow `PageHeaderProps`.

## Slots

`title`, `description` and `actions`, as on `PageHeader`.

## Verification

- Focused test references: [RouteComponents.dom.test.ts](../../../../../tests/unit/router/RouteComponents.dom.test.ts).
