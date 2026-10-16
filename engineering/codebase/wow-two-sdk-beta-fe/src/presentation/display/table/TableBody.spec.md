# TableBody

Renders the `tbody` of a `Table`, picking up striping and hover from the root.

Source: [TableBody.vue](TableBody.vue).

Public import: `import { TableBody } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Mount within the owner supplying `useTableContext`; a compound part is not an independent root.
- In a stacked `Table`, below its breakpoint, it spaces its rows as a column of cards. While stacking it restates
  `role="rowgroup"`.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

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
