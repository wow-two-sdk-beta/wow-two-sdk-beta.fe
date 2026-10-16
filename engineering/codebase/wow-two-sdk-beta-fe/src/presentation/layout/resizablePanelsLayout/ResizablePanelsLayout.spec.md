# ResizablePanelsLayout

Renders two-or-more resizable panes split by draggable separators.

Source: [ResizablePanelsLayout.vue](ResizablePanelsLayout.vue).

Public import: `import { ResizablePanelsLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Panel registration derives initial sizes without emitting `update:sizes`; only resizing gestures emit intent.
- Keyboard, drag and reset preserve adjacent total and clamp through both panels’ feasible interval. Impossible constraints are ignored.
- Zero default weights reset to equal sizes. Drag teardown restores preexisting body cursor and selection styles.

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                    | Required | Default                  | Meaning                                                                                            |
| -------------- | ----------------------- | -------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `orientation`  | `Orientation`           | no       | `Orientation.Horizontal` | The split axis — `horizontal` (side-by-side panels) or `vertical` (stacked). Default `horizontal`. |
| `defaultSizes` | `ReadonlyArray<number>` | no       | `undefined`              | Declared by the source contract.                                                                   |
| `sizes`        | `ReadonlyArray<number>` | no       | `undefined`              | Declared by the source contract.                                                                   |

## Emits

| Event          | Signature                                        | Meaning                     |
| -------------- | ------------------------------------------------ | --------------------------- |
| `update:sizes` | `'update:sizes': [sizes: ReadonlyArray<number>]` | See the declared signature. |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
