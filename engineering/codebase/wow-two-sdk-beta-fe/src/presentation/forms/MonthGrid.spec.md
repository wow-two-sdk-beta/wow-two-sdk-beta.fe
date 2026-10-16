# MonthGrid

Renders the shared 42-cell month grid — month nav, weekday row, keyboard-navigable day cells.

Source: [MonthGrid.vue](MonthGrid.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `viewMonth` | `Temporal.PlainDate` | yes | — | The first day of the visible month (use `startOfMonth(date)`). |
| `focusedDate` | `Temporal.PlainDate` | yes | — | The currently focused day (cell tabindex=0). |
| `isDayDisabled` | `(date: Temporal.PlainDate) => boolean` | no | — | The predicate marking a day as disabled. |
| `onDayActivate` | `(date: Temporal.PlainDate, meta: { outOfMonth: boolean }) => void` | no | — | Emits the activated day on click / Enter / Space. |
| `dayProps` | `(date: Temporal.PlainDate, meta: { outOfMonth: boolean }) => MonthGridDayProps \| undefined` | no | — | The extra per-day attributes for selection styling and hover handlers. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:viewMonth` | `'update:viewMonth': [date: Temporal.PlainDate];` | See the declared signature. |
| `update:focusedDate` | `'update:focusedDate': [date: Temporal.PlainDate]` | See the declared signature. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
