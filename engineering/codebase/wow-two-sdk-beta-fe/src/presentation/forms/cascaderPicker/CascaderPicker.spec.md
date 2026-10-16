# CascaderPicker

Renders a trigger that opens side-by-side columns — each pick opens the next level — and shows the picked path, such as country → region → city.

Source: [CascaderPicker.vue](CascaderPicker.vue).

Public import: `import { CascaderPicker, type CascaderOption } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is the picked path of values, root first (`['europe', 'france', 'paris']`), or `null`. Values need to be unique among siblings only. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper.
- Each column is a `role="listbox"`; the first lists `options`, and every browsed branch opens a column of its children. Columns other than the first are named by their branch. Branch options carry `aria-haspopup="listbox"` and a chevron.
- Clicking a branch, or pressing Enter, Space or the inward arrow on it, opens its column; the keyboard also moves focus into it. Picking a leaf commits the whole path and closes the popover. Disabled options neither open nor pick.
- Keyboard: ArrowUp / ArrowDown / Home / End move between the enabled options of a column (roving tab stop); the outward arrow returns to the parent column. Inward and outward mirror in right-to-left layouts.
- Opening seeds the browsed path from the pick, so the picked leaf and its ancestors show. The trigger joins the path labels with `separator`; a path that no longer resolves shows its raw values.
- Disabled, read-only and invalid states fall back to the surrounding `Field`, as do the trigger's id, label and description. Attributes and `class` reach the trigger.
- A `name` ships one hidden input per path value, root first; native form reset restores the default.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `options` | `ReadonlyArray<CascaderOption>` | yes | — | The first column: `{ value, label, children?, isDisabled? }`. |
| `modelValue` | `ReadonlyArray<string> \| null` | no | — | The picked path, controlled — the `v-model` target. |
| `defaultValue` | `ReadonlyArray<string> \| null` | no | `null` | The initial path when uncontrolled. |
| `placeholder` | `string` | no | `'Pick an option'` | The trigger text with nothing picked; localized as `CascaderPicker.placeholder`. |
| `separator` | `string` | no | `' / '` | The joiner between path labels. |
| `size` | `SelectPickerSize` | no | — | The trigger size. |
| `id` | `string` | no | Field id | The trigger id. |
| `isDisabled` | `boolean` | no | Field state | Blocks interaction. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the value but blocks changes. |
| `isInvalid` | `boolean` | no | Field state | Styles the trigger as invalid. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [path: string[] \| null];` | Fires when the reader picks a leaf. |

## Slots

None.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [CascaderPicker.dom.test.ts](../../../../tests/unit/presentation/forms/CascaderPicker.dom.test.ts) — preset columns, branch clicks, disabled branches, leaf picks, keyboard travel across columns, hidden values and read-only.
