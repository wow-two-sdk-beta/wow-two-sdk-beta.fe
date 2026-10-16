# MenuRadioGroup

Renders a labelled `role="group"` band whose `MenuRadioItem` rows choose exactly one value.

Source: [MenuRadioGroup.vue](MenuRadioGroup.vue).

Public import: `import { MenuRadioGroup } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within `Menu`; each `MenuRadioItem` must sit inside a group.
- The selection uses the shared controlled-state helper: `modelValue` / `update:modelValue`, seeded by `defaultValue`. `null` selects nothing and never selects a mode.
- Picking the selected row again emits nothing.
- Attributes and `class` pass straight to the group element.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string \| null` | no | `undefined` | The selected value, controlled. The `v-model` binding target. |
| `defaultValue` | `string \| null` | no | `null` | The initial selected value when uncontrolled. |
| `label` | `string \| number` | no | `undefined` | The group heading; it names the group through `aria-labelledby`. |
| `isDisabled` | `boolean` | no | `false` | Disables every row that does not set its own `isDisabled`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string \| null];` | Fires when the reader picks a row — the `v-model` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The `MenuRadioItem` rows. |
| `label` | `label?(): unknown` | The rich override for the `label` prop. |

## Exposed handle

`{ el }` — the group element.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts) — selection, labelling and the disabled group.
