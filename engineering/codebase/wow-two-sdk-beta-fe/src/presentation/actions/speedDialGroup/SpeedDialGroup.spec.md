# SpeedDialGroup

Renders a pinned trigger that fans a stack of action buttons out across the viewport when opened.

Source: [SpeedDialGroup.vue](SpeedDialGroup.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop          | Type                      | Required | Default                       | Meaning                                                                             |
| ------------- | ------------------------- | -------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `position`    | `SpeedDialGroupPosition`  | no       | `OverlayPosition.BottomRight` | The viewport anchor. Default `bottom-right`.                                        |
| `direction`   | `SpeedDialGroupDirection` | no       | `undefined`                   | The axis the action items fan out along. Defaults to the one implied by `position`. |
| `open`        | `boolean`                 | no       | `undefined`                   | The controlled open state.                                                          |
| `defaultOpen` | `boolean`                 | no       | `false`                       | The uncontrolled initial state.                                                     |
| `gap`         | `number`                  | no       | `12`                          | The pixel gap between stacked action items. Default 12.                             |

## Emits

| Event         | Signature                         | Meaning                                                           |
| ------------- | --------------------------------- | ----------------------------------------------------------------- |
| `update:open` | `'update:open': [open: boolean];` | Fires when the dial opens or closes, carrying the new open state. |

## Slots

None declared.

## Exposed handle

`{ el: rootEl }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Arrow navigation uses current enabled action DOM order, skips native/ARIA-disabled items, and ignores composing or caller-cancelled keys. Closing restores the trigger only while the dial owns focus, including controlled close. No delayed focus callback can steal focus from a newly opened surface. Actions remaining during exit animation cannot run. Trigger anchoring uses the FAB's exposed DOM handle.
