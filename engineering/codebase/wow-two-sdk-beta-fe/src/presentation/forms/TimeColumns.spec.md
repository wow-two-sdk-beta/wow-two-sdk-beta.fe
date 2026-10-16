# TimeColumns

Renders the paired hour and minute listboxes, scrolling the selected rows into view when opened.

Source: [TimeColumns.vue](TimeColumns.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `Temporal.PlainTime \| null` | yes | — | The selected time. `null` renders both columns with nothing selected. |
| `minuteStep` | `number` | no | `5` | The minute interval between rows. Default 5. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: Temporal.PlainTime]` | See the declared signature. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
