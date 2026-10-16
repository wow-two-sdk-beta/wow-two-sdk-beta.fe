# TimeGridView

Renders the week / day time grid of an `EventCalendarViewer`.

Source: [TimeGridView.vue](TimeGridView.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop        | Type                                      | Required | Default | Meaning                          |
| ----------- | ----------------------------------------- | -------- | ------- | -------------------------------- |
| `timeZone`  | `string`                                  | yes      | —       | Declared by the source contract. |
| `events`    | `ReadonlyArray<EventCalendarViewerEvent>` | yes      | —       | Declared by the source contract. |
| `days`      | `number`                                  | yes      | —       | Declared by the source contract. |
| `firstDay`  | `Temporal.PlainDate`                      | yes      | —       | Declared by the source contract. |
| `hourRange` | `[number, number]`                        | yes      | —       | Declared by the source contract. |

## Emits

| Event         | Signature                                                 | Meaning                                   |
| ------------- | --------------------------------------------------------- | ----------------------------------------- |
| `event-click` | `'event-click': [event: EventCalendarViewerEvent];`       | Fires when an event block is clicked.     |
| `slot-click`  | `'slot-click': [day: Temporal.PlainDate, hour?: number];` | Fires when an empty hour cell is clicked. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
