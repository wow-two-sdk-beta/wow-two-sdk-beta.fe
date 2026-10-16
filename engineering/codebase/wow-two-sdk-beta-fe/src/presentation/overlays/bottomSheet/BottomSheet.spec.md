# BottomSheet

Renders a mobile bottom sheet with a drag handle and snap points.

Source: [BottomSheet.vue](BottomSheet.vue).

Public import: `import { BottomSheet } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- A modal FocusScope traps/loops focus and owns modal background isolation.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- The drag handle is the keyboard affordance and takes initial focus: ArrowUp raises the snap, ArrowDown lowers it and,
  from the lowest snap with `dragToDismiss`, closes the sheet.
- The handle is a named, focusable separator (`BottomSheet.resize`) whose `aria-valuetext` speaks the height as
  `BottomSheet.snapPosition` ("Height {index} of {count}").
- Regression: `tests/unit/presentation/overlays/SheetsAndHoverCard.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |
| `snapPoints` | `ReadonlyArray<SnapPoint>` | no | `() => ['40vh', '90vh']` | The heights the sheet snaps between — px numbers or CSS lengths. Default `['40vh', '90vh']`. |
| `initialSnap` | `number` | no | `0` | The snap index the sheet opens at. Default 0. |
| `canDismissOnOutsideClick` | `boolean` | no | `true` | The outside-click dismissal toggle. Default `true`. |
| `dismissOnOutsideClick` | `boolean` | no | —      | Deprecated — use `canDismissOnOutsideClick`; removed next release. |
| `canDismissOnEscape` | `boolean` | no | `true` | The Escape dismissal toggle. Default `true`. |
| `dismissOnEscape` | `boolean` | no | —      | Deprecated — use `canDismissOnEscape`; removed next release. |
| `canDragToDismiss` | `boolean` | no | `true` | The drag-below-lowest-snap dismissal toggle. Default `true`. |
| `dragToDismiss` | `boolean` | no | —      | Deprecated — use `canDragToDismiss`; removed next release.   |
| `variant` | `SurfaceVariant` | no | — | The visual recipe. Default `elevated`. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. Default `none`. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Default `none`. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. Default `5`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the sheet opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
