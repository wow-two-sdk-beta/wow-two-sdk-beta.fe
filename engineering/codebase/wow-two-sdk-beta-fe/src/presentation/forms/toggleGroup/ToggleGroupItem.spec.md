# ToggleGroupItem

Renders one toggle button of a `ToggleGroup` — a label with an optional leading icon and a trailing count, for facet and filter chips.

Source: [ToggleGroupItem.vue](ToggleGroupItem.vue).

Public import: `import { ToggleGroupItem } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- A `ToggleInput` inside a `ToggleGroup`: it reads and writes the group's selection through the same context, keyed by `value`. Every other `ToggleInput` prop (`variant`, `tone`, `isDisabled`, `class`, listeners) falls through to it.
- `count` renders after the label in a muted tabular figure (`data-toggle-count`, `tabular-nums`, 70% opacity so it stays readable on a pressed fill). It is formatted for the active locale (`1,200`).
- The accessible name is the consumer's `aria-label`, else `label`, followed by the count: `"Conference 12"`. The order comes from the message `ToggleGroupItem.countedName` (default `'{label} {count}'`), so a locale can write the count first.
- `icon` draws before the label, decorative (`aria-hidden`), at `iconSize` pixels. It takes a `lucide-vue-next` icon or any component of that shape.
- The default slot replaces the label text, not the icon or the count, and receives `{ pressed }`.
- `ToggleGroup`'s `options` prop renders these items from data; use this component directly to mix them with other children.

## Props

| Prop       | Type          | Required | Default     | Meaning                                                                          |
| ---------- | ------------- | -------- | ----------- | -------------------------------------------------------------------------------- |
| `value`    | `string`      | yes      | —           | The identity keying this item in the group's selection.                          |
| `label`    | `string`      | no       | `undefined` | The item's text and, with the count, its accessible name.                        |
| `count`    | `number`      | no       | `undefined` | The tally after the label.                                                       |
| `icon`     | `IconAdapter` | no       | `undefined` | The icon before the label.                                                       |
| `iconSize` | `number`      | no       | `15`        | The icon's pixel size.                                                           |

Inherited contracts: `extends /* @vue-ignore */ Omit<ToggleInputProps, 'value'>`. These members remain part of the component surface.

## Slots

| Slot      | Signature                                        | Meaning                                                              |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `default` | `default?(props: { pressed: boolean }): unknown;` | The label content, richer than the `label` prop it falls back to. |

## Exposed handle

No explicit exposed handle.

## Verification

- Focused tests: [ToggleGroupItems.dom.test.ts](../../../../tests/unit/presentation/forms/ToggleGroupItems.dom.test.ts) — the count rendering, updating and formatting, the accessible name, the locale order, the icon, selection through the group.
- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
