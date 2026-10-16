# TableCell

Renders a `td` in a `Table`, padded to the root density.

Source: [TableCell.vue](TableCell.vue).

Public import: `import { TableCell } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Mount within the owner supplying `useTableContext`; a compound part is not an independent root.
- In a stacked `Table`, below its breakpoint, the cell is a line of label then value. The label is the column's header
  text unless `label` is set; `label: ''` shows none. A set `label` renders on the server and carries
  `data-fixed-label`, which keeps the table from replacing it.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string` | no | — | The stacked label; omit it for the column's header text, `''` for none. |

Inside a `DataRegion` first load, plain cell text turns into a bar at the cell's line height, an empty cell draws a
default bar, and a cell holding components lets them draw their own shapes. Render placeholder rows over
`useSkeletonItems` stand-ins.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
