# ListGroupItem

Renders a `ListGroup` row with an optional check marker and leading / trailing adornments.

Source: [ListGroupItem.vue](ListGroupItem.vue).

Public import: `import { ListGroupItem } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Mount within the owner supplying `useListContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `hasCheckMarker` | `boolean` | no | `undefined` | The check-marker override. Omitted, it follows the parent `ListGroup`'s `marker` — a check appears under `marker="check"` and nowhere else. Set it explicitly to force the marker on or off for one row. |

Inside a skeleton `ListGroup` or a `DataRegion` first load, the row keeps its box and padding: plain text turns into
bars, an empty row draws a default bar, components in it draw their own shapes, and the check marker keeps its space
but hides.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `leading` | `leading?(): unknown;` | The leading slot — icon, avatar, marker. the legacy `leading` node prop. |
| `trailing` | `trailing?(): unknown;` | The trailing slot — badge, chevron, status. the legacy `trailing` node prop. |
| `default` | `default(): unknown;` | The row content — the default slot. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
