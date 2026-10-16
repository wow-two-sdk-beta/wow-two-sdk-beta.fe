# OverflowGroup

Renders the first items of a list in one row and a single marker counting the rest.

Source: [OverflowGroup.vue](OverflowGroup.vue).

Public import: `import { OverflowGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- The first `max` items render through the default slot; the rest collapse into one marker. No marker renders when everything fits.
- The default marker reads `+{count}` and is named `{count} more` for assistive tech, both localized (`OverflowGroup.overflowLabel`, `OverflowGroup.hiddenItems`). A caller `overflowLabel` also fills `{count}`.
- The `overflow` slot replaces the marker and receives the hidden items — put a tooltip or popover listing them there.
- The row never wraps; the count is by items, not measured width. A `max` that is not finite falls back to 3; others round, at least 0.
- Attributes and `class` reach the row.

## Props

| Prop            | Type                                           | Required | Default      | Meaning                                              |
| --------------- | ---------------------------------------------- | -------- | ------------ | ---------------------------------------------------- |
| `items`         | `ReadonlyArray<T>`                             | yes      | —            | Every item.                                          |
| `max`           | `number`                                       | no       | `3`          | The most items shown before the marker.              |
| `getKey`        | `(item: T, index: number) => string \| number` | no       | index        | Stable identity per item.                            |
| `overflowLabel` | `string`                                       | no       | `'+{count}'` | The marker text; `{count}` becomes the hidden count. |

## Emits

None.

## Slots

| Slot       | Signature                                                               | Meaning              |
| ---------- | ----------------------------------------------------------------------- | -------------------- |
| `default`  | `default(props: { item: T; index: number }): unknown`                   | One visible item.    |
| `overflow` | `overflow(props: { hidden: ReadonlyArray<T>; count: number }): unknown` | Replaces the marker. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
- Focused tests: [OverflowGroup.dom.test.ts](../../../../tests/unit/presentation/display/OverflowGroup.dom.test.ts) — the cut, the marker name, the custom marker and localization.
