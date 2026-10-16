# ScheduleView

Renders a single day of a multi-resource schedule — one row per resource across an hours grid.

Source: [ScheduleView.vue](ScheduleView.vue).

Public import: `import { ScheduleView } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `resources` | `ReadonlyArray<ScheduleResource>` | yes | — | Declared by the source contract. |
| `bookings` | `ReadonlyArray<ScheduleBooking>` | yes | — | Declared by the source contract. |
| `date` | `Temporal.ZonedDateTime` | no | — | The day to render; its calendar date + time zone anchor the grid. |
| `hourRange` | `[number, number]` | no | `() => [8, 20]` | Declared by the source contract. |
| `slotMinutes` | `number` | no | `30` | Declared by the source contract. |
| `onSlotClick` | `(resourceId: string, time: Temporal.ZonedDateTime) => void` | no | — | Handles a click on an empty slot. Kept a PROP rather than an emit: its presence is what renders the slot overlay at all, and Vue strips a declared emit's listener out of `useAttrs()` — an emit could never be detected, so the overlay would either always or never render. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `booking-click` | `'booking-click': [booking: ScheduleBooking];` | Fires when a booking is clicked. Replaces the legacy `onBookingClick`. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `resource` | `resource?(props: { resource: ScheduleResource }): unknown;` | Overrides a resource row's label. Falls back to `resource.label`. |
| `booking` | `booking?(props: { booking: ScheduleBooking }): unknown;` | Overrides a booking's body. Falls back to the label + time range. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
