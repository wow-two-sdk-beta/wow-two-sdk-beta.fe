# AppLink

A plain in-app link: a `<RouterLink>` anchor with no chrome of its own. Text links and `Button as-child` targets use
it; `AppNavLink` stays the navigation row with `NavItem` styling.

## Props

| Prop             | Type               | Required | Default     | Meaning                                                          |
| ---------------- | ------------------ | -------- | ----------- | ---------------------------------------------------------------- |
| `to`             | `RouteLocationRaw` | yes      | —           | The destination — a path, or a full route location.              |
| `isExact`        | `boolean`          | no       | `undefined` | Whether only the exact destination marks the link active.        |
| `end`            | `boolean`          | no       | —           | Deprecated — use `isExact`; removed next release.                |
| `replace`        | `boolean`          | no       | `undefined` | Whether to replace the current history entry instead of pushing. |
| `viewTransition` | `boolean`          | no       | `undefined` | Whether to animate the navigation with the View Transitions API. |
| `prefetch`       | `LazyRoute`        | no       | `undefined` | The destination's lazy module, warmed on hover and focus.        |

Native anchor attributes (`class`, `aria-*`, `target`, listeners) fall through to the anchor; `href` comes from `to`.

## States

- `data-active` is present while the destination matches the route (descendants included unless `end`).
- `aria-current="page"` comes from `RouterLink` on the exact match.

## Slots

| Slot      | Signature             | Meaning             |
| --------- | --------------------- | ------------------- |
| `default` | `default(): unknown;` | The link's content. |
