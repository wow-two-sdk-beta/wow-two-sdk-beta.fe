# NotificationCenterGroup

Renders a notification panel — title and count header, a scrolling item list, optional footer.

Source: [NotificationCenterGroup.vue](NotificationCenterGroup.vue).

Public import: `import { NotificationCenterGroup } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Passing an explicit `bus` renders its newest-first retained snapshot, including notices published before mount; no storage, account or network wiring is implied. No `bus` retains the slot-only API.
- The default list displays severity glyphs, notice copy, product actions and an accessible icon-only Delete control. Deleting removes retained history and any visible toast through the same bus.
- `historyAction` can replace the notice's `action` or hide it with `false`. A real deadline removes the action when it passes. The history row and a separate Report action remain available.
- `canPause` adds a selector for timed pause, indefinite pause or resuming pop-ups through the supplied bus.
- Each bus row shows when it arrived: a live `RelativeTime` of `publishedAtMs` in the row's timestamp slot, with the absolute time in its tooltip.
- A row is unread while its id is in the bus's `unreadIds`: bold title, a leading dot (a `Highlight` fill in forced colors) and visually hidden "Unread" text. The panel never marks anything read by itself.
- With a `bus`, the header shows icon buttons named "Mark all read" (only while something is unread) and "Clear all" (only while entries exist, and only when `canClear`), after any `headerActions` content and before Close. Mark all read calls `markNotificationsRead()` and keeps the rows; Clear all calls `clearRetained()`, which also closes the live toasts. Focus that sat on a button that left the header moves to the panel root.
- A row whose notice has `progress` shows a slim bar under the description: determinate when `progress.value` is a number (`max` defaults to 1), indeterminate otherwise. It is a named `progressbar` and `progress.label` follows as muted text. Republishing the id without `progress` drops the bar.
- A custom default slot replaces bus-rendered rows. An explicit `count` or count slot overrides the retained count.
- Bus changes and unmounting unsubscribe; reset/dispose clears this bus's rows. Scope identity and reset/disposal belong to the application.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| pause `<select>` | at least 44px tall and 16px text (a native field: no pseudo-element; no iOS focus zoom) | visible height, text size |
| item dismiss button | shown at rest under `(hover: none)`; with a mouse it shows on hover and focus | reveal |

## Props

| Prop       | Type               | Required | Default           | Meaning                                                                                                                                                              |
| ---------- | ------------------ | -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bus`      | `FeedbackBus`      | no       | —                 | Explicit in-memory retained-notification scope.                                                                                                                      |
| `title`    | `string`           | no       | `'Notifications'` | The header title. Default `"Notifications"`. Rich content → the `title` slot.                                                                                        |
| `count`    | `string \| number` | no       | —                 | The badge / count rendered next to the title. Rich content → the `count` slot.                                                                                       |
| `canPause` | `boolean`          | no       | `false`           | Show pause controls when a bus is provided.                                                                                                                          |
| `canClear` | `boolean`          | no       | `true`            | Show the "Clear all" header action when a bus is provided.                                                                                                           |
| `onClose`  | `() => void`       | no       | —                 | Fires when the close button is activated, asking the containing popover or panel to close; the button renders only when supplied. It never deletes retained history. |

## Emits

None declared. `close` is the `onClose` prop above: its presence picks whether the Close icon renders.

## Slots

| Slot            | Signature                    | Meaning                                                                |
| --------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `default`       | `default?(): unknown;`       | The `NotificationCenterGroupItem` children filling the scrolling list. |
| `title`         | `title?(): unknown;`         | The header title. Falls back to the `title` prop.                      |
| `count`         | `count?(): unknown;`         | The header badge. Falls back to the `count` prop.                      |
| `headerActions` | `headerActions?(): unknown;` | The controls at the right of the header.                               |
| `emptyState`    | `emptyState?(): unknown;`    | Replaces the built-in "all caught up" placeholder shown with no items. |
| `footer`        | `footer?(): unknown;`        | The footer band under the list. Omitting it drops the band.            |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
