# MenuRadioItem

Renders one single-choice menu row that marks the group's selected value with a dot.

Source: [MenuRadioItem.vue](MenuRadioItem.vue).

Public import: `import { MenuRadioItem } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within `MenuRadioGroup` inside a `Menu`; the group owns the selected value.
- A row's own `isDisabled` wins; when omitted the group's `isDisabled` applies.
- Unmount disposes the menu registration.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value this row selects. |
| `state` | `MenuItemState` | no | `undefined` | The visual state of the row. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state; falls back to the group's. |
| `canCloseOnSelect` | `boolean` | no | `true` | Closes the whole menu tree after a pick; `false` keeps it open. |
| `closeOnSelect` | `boolean` | no | —      | Deprecated — use `canCloseOnSelect`; removed next release.      |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires after the reader picks this row with Enter, Space or a click. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The row label. |
| `indicator` | `indicator?(props: { checked: boolean }): unknown` | The selection mark override, drawn in the fixed leading column. |

## Exposed handle

`{ el }` — the row `<button>`.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts).

## Interaction guarantees

The row renders `role="menuitemradio"` with `aria-checked` and `data-state`. Keyboard walking and the mouse highlight follow [MenuCheckboxItem](MenuCheckboxItem.spec.md#interaction-guarantees).
