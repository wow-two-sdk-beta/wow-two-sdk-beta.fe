# TransferPicker

Renders two lists side by side — what is available and what is selected — with buttons that move the checked options, or all of them, across.

Source: [TransferPicker.vue](TransferPicker.vue) · lists: [ListboxPicker](../listboxPicker/ListboxPicker.spec.md).

Public import: `import { TransferPicker, type TransferOption } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is the array of keys in the target list, in target order. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper; moved keys append in source order.
- The source list shows every option not in the model, in `options` order. Model keys that no option describes are kept but not shown. Keys compare by identity, so use primitives or stable references.
- Each list is a multi-select `ListboxPicker` named by its heading: checking is transient and never reported. The four buttons move the checked options or every option, each way, and disable when nothing would move. Double-clicking an option moves it alone.
- Disabled options stay where they are: they never move, even with "all".
- With `isSearchable`, each list filters by label (locale-aware, case-insensitive). Moves act on the visible options only. The empty row reads `No matches` while filtering, else `Nothing here`.
- The heading row tallies `checked/total`. The `option` slot replaces an option's content in either list.
- Disabled falls back to the surrounding `Field`, whose label names the group. Attributes and `class` reach the root grid.
- A `name` ships one hidden input per target key (`String(key)`).

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `options` | `ReadonlyArray<TransferOption<K>>` | yes | — | Every option: `{ key, label, description?, isDisabled? }`. |
| `modelValue` | `ReadonlyArray<K>` | no | — | The target keys, controlled — the `v-model` target. |
| `defaultValue` | `ReadonlyArray<K>` | no | `[]` | The initial target keys when uncontrolled. |
| `sourceLabel` | `string` | no | `'Available'` | The source heading; localized as `TransferPicker.sourceLabel`. |
| `targetLabel` | `string` | no | `'Selected'` | The target heading; localized as `TransferPicker.targetLabel`. |
| `isSearchable` | `boolean` | no | `false` | Adds a filter box to each list. |
| `isDisabled` | `boolean` | no | Field state | Blocks checking and moving. |
| `name` | `string` | no | — | The hidden input name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [keys: K[]];` | Fires when the reader moves options across. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `option` | `option(props: { option: TransferOption<K>; side: 'source' \| 'target' }): unknown` | Replaces an option's content. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [TransferPicker.dom.test.ts](../../../../tests/unit/presentation/forms/TransferPicker.dom.test.ts) — list split, checked and all moves, disabled options, filtering, double-click, hidden inputs and the disabled state.
