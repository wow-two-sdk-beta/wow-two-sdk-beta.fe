# TableHeaderCell

Renders a `th` column header in a `Table`, padded to the root density.

Source: [TableHeaderCell.vue](TableHeaderCell.vue).

Public import: `import { TableHeaderCell } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Mount within the owner supplying `useTableContext`; a compound part is not an independent root.
- In a stacked `Table`, below its breakpoint, a head-row cell is an item of the control bar at its own width
  (`width` styles yield); one holding no control is visually hidden. A body or footer `th` lays out as a `TableCell`,
  with the same `label`.
- While stacking it restates `role`: `rowheader` for `scope="row"`, `columnheader` otherwise.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string` | no | — | A body or footer `th`'s stacked label; omit it for the column's header text, `''` for none. |

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
