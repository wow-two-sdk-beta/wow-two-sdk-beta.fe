# Toast

Renders a toast card — icon, title, description, actions, and a close button.

Source: [Toast.vue](Toast.vue).

Public import: `import { Toast } from '@wow-two-beta/fe/presentation/feedback';`.

## Contract

- `onDelete` (a `@delete` binding) renders an icon-only Delete control with `deleteLabel`; omission hides it. `onClose` (`@close`)
  renders the Close button the same way. The caller only supplies `onDelete` for retained notices.
- A non-neutral toast without an `icon` shows its severity's glyph (`SeverityIcons` from `foundation/icons`), coloured with the tone's `-soft-foreground` token, so severity never rests on colour alone. `showSeverityIcon: false` removes it; an `icon` prop or slot replaces it.
- Slot presence is read on every render, so a host that updates a toast in place may add or drop a title, description, action or trailing adornment.
- The `trailing` slot sits between the body and the close button — a countdown or a timestamp.
- Close, Delete and Pin use circular icon buttons. `closeIndicator` draws a decorative ring inside the Close
  button. An explicit `isPinned` value shows a toggle whose accessible name stays stable when pressed.
- Those buttons are 24px under either pointer; under a coarse one an invisible 44px square centred on each
  (`pointer-coarse:after:`) takes the tap, so the card keeps its height and the icons their place. The `details`
  toggle reaches 44px high.
- The `details` slot adds a disclosure. Its scrollable content uses the full card width and stays available
  while the reader interacts with the card. The host may control it with `detailsOpen`.
- `isCompact` reduces vertical spacing and lays out actions beside the text, with wrapping as needed.
  The default card places actions below the text.
- `surface` picks the card material, `ToastSurface.Solid` (default, the opaque popover fill) or `ToastSurface.Glass`.
  Glass sets `data-toast-surface="glass"` and paints `surface-glass-menu`, the `--glass-edge` hairline and
  `--glass-menu-shadow` plus the `--glass-highlight` inset; each falls back to its registered default when a
  theme sets nothing. `prefers-reduced-transparency` returns the opaque fill. A non-neutral severity keeps its
  own border and glyph on glass, so its accent still reads; the card keeps the default radius and width.
- `progress` (`NoticeProgress`: `value`, `max`, `label`) renders a slim bar under the copy and above the
  actions, below the row when compact, with `role="progressbar"`. Omitting `value` (or `NaN`) is indeterminate:
  no `aria-valuenow`, a sliding segment under `motion-safe`, a still partial fill under reduced motion. `max`
  defaults to 1 and a bad one reads as 1; `value` clamps to 0–`max`. The title names the bar (`aria-labelledby`),
  else `progress.label`, else "Progress"; the label also shows as muted text and describes the bar.
  `isCompact` draws a thinner bar. The host decides that a running toast stays up.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop               | Type             | Required | Default                 | Meaning                                                                           |
| ------------------ | ---------------- | -------- | ----------------------- | --------------------------------------------------------------------------------- |
| `severity`         | `Severity`       | no       | —                       | The semantic severity palette.                                                    |
| `icon`             | `string`         | no       | —                       | The optional leading icon. Rich content → the `icon` slot.                        |
| `title`            | `string`         | no       | —                       | The bold heading line. Rich content → the `title` slot.                           |
| `description`      | `string`         | no       | —                       | The body text below the title. Rich content → the `description` slot.             |
| `actions`          | `string`         | no       | —                       | The action area. Rich content → the `actions` slot.                               |
| `isCompact`        | `boolean`        | no       | `false`                 | Use the compact layout for the body and actions.                                  |
| `closeLabel`       | `string`         | no       | `'Dismiss'`             | The accessible label for the close button. Default `"Dismiss"`.                   |
| `deleteLabel`      | `string`         | no       | `'Delete notification'` | Accessible label for the Delete control.                                          |
| `isPinned`         | `boolean`        | no       | —                       | Pressed state of the optional pin toggle.                                         |
| `detailsOpen`      | `boolean`        | no       | —                       | Controlled details disclosure.                                                    |
| `pinLabel`         | `string`         | no       | `'Pin notification'`    | Accessible label for the pin toggle.                                              |
| `unpinLabel`       | `string`         | no       | `'Unpin notification'`  | Tooltip when the pin is active.                                                   |
| `showSeverityIcon` | `boolean`        | no       | `true`                  | Shows the severity's own glyph when no `icon` is given; `neutral` has none.       |
| `surface`          | `ToastSurface`   | no       | `'solid'`               | The card material: `'solid'` or `'glass'`.                                        |
| `progress`         | `NoticeProgress` | no       | —                       | A running operation's progress; `{ value?, max?, label? }`.                       |
| `onClose`          | `() => void`     | no       | —                       | Fires when the close button is activated; the button renders only when supplied.  |
| `onDelete`         | `() => void`     | no       | —                       | Fires when the delete button is activated; the button renders only when supplied. |

## Emits

| Event             | Signature          | Meaning                                    |
| ----------------- | ------------------ | ------------------------------------------ |
| `togglePin`       | `togglePin: [];`   | Requests a change to the pin state.        |
| `update:detailsOpen` | `[value: boolean]` | Requests a change to the disclosure state. |

`close` and `delete` are the `onClose` and `onDelete` props above, not emits: their presence picks what renders.

## Slots

| Slot             | Signature                     | Meaning                                                              |
| ---------------- | ----------------------------- | -------------------------------------------------------------------- |
| `default`        | `default?(): unknown;`        | The extra content below the description.                             |
| `icon`           | `icon?(): unknown;`           | The leading icon. Falls back to the `icon` prop.                     |
| `title`          | `title?(): unknown;`          | The heading line. Falls back to the `title` prop.                    |
| `description`    | `description?(): unknown;`    | The body text below the title. Falls back to the `description` prop. |
| `actions`        | `actions?(): unknown;`        | The action row. Falls back to the `actions` prop.                    |
| `details`        | `details?(): unknown;`        | Content for the optional disclosure.                                 |
| `trailing`       | `trailing?(): unknown;`       | The adornment beside the close button — a countdown, a timestamp.    |
| `closeIndicator` | `closeIndicator?(): unknown;` | Decorative content around the close glyph.                           |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
