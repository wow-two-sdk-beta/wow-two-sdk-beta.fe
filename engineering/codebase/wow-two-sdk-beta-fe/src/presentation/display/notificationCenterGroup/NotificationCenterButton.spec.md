# NotificationCenterButton

Renders the notification bell with its unread count and pop-up pause cue.

Source: [NotificationCenterButton.vue](NotificationCenterButton.vue).

Public import: `import { NotificationCenterButton } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Give it the same `bus` as the panel, the controlled `isExpanded` state and the panel's id as `aria-controls`.
  Handle `toggle` in the shell. The exposed `el` supports focus return when the panel closes.
- The bell shows unread retained entries, with `99+` as the visual cap and the full count in its accessible label.
  While `isExpanded` is true the badge and the count in the label are hidden, and notices that arrive stay unread.
- Collapsing the panel, unmounting it while expanded, or swapping `bus` while expanded calls `markNotificationsRead()`
  on the bus that was open; opening marks nothing.
- While pop-ups are paused, a published notice the pause suppresses (`bus.suppresses(notice)`) highlights the bell;
  one that breaks through the pause pops up and needs no cue. Transient notices do not add to the unread count.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Fallthrough attributes reach the underlying `Button`; `aria-controls` takes the panel's id there.

## Props

| Prop         | Type          | Required | Default           | Meaning                                                                                                 |
| ------------ | ------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `bus`        | `FeedbackBus` | yes      | —                 | The bus whose unread count and pop-up pause the bell shows.                                             |
| `isExpanded` | `boolean`     | no       | —                 | The open state of the panel the bell controls; an open panel hides the badge and, on close, marks read. |
| `label`      | `string`      | no       | `'Notifications'` | The accessible name before the unread and pause suffixes.                                               |

## Emits

| Event    | Signature     | Meaning                                             |
| -------- | ------------- | --------------------------------------------------- |
| `toggle` | `toggle: [];` | Requests opening or closing the notification panel. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Behaviour: `tests/unit/presentation/feedback/NotificationCenter.dom.test.ts` (`notification button`).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
