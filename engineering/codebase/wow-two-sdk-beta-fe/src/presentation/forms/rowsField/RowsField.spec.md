# RowsField

Renders a list of records as rows of cells — headings, a remove control per row, the list's refusals, one add control.

Source: [RowsField.vue](RowsField.vue).

Public import: `import { RowsField } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- A `fieldset` named by its `legend` (`label`); from `sm` up a heading row over a grid of one column per entry in
  `columns` plus the remove control's column.
- Below `sm` the headings hide and each record stacks in its own bordered block, a label over every cell and its
  remove control last.
- Engine-free: the `cell` slot renders each input. In a form, feed `rows` from `useFieldArray(form, path).rows`, wrap
  each cell in `rows.Field`, and answer `add` / `remove` with the array's `push` / `remove`.
- The slot's `label` (`{column} {row number}`) is the cell input's accessible name; the visible phone label is
  `aria-hidden`.
- `errors` render as `role="alert"` lines under the rows — the list's own refusals, not a cell's.
- The headings hide while `rows` is empty; the add control always shows.
- `isDisabled` disables the add and remove controls; the cells stay the caller's.
- Automatic attribute inheritance is disabled; attributes and `class` reach the `fieldset`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string` | yes | — | The list's legend. |
| `columns` | `ReadonlyArray<RowsFieldColumn>` | yes | — | The columns: `key` and `label`, left to right. |
| `rows` | `ReadonlyArray<RowsFieldRow>` | yes | — | The rows: stable `key` and live `index`. |
| `addLabel` | `string` | no | locale `Add row` | The add control's text. |
| `removeLabel` | `string` | no | locale `Remove row {row}` | The remove control's name; `{row}` is the 1-based row. |
| `errors` | `ReadonlyArray<string>` | no | `[]` | The list's own refusals. |
| `isDisabled` | `boolean` | no | `false` | Disables the add and remove controls. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `add` | `add: []` | The reader asked for a new row. |
| `remove` | `remove: [index: number]` | The reader removed the row at `index`. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `cell` | `cell(props: { row: RowsFieldRow; column: RowsFieldColumn; label: string }): unknown` | One cell's input. |

## Exposed handle

No explicit exposed handle.

```vue
<script setup lang="ts">
const checks = useFieldArray<SmokeCheck>(form, 'smokeChecks');
</script>
<template>
  <form.Field name="smokeChecks" v-slot="list">
    <RowsField
      label="Smoke checks"
      :columns="[{ key: 'service', label: 'Service' }, { key: 'path', label: 'Path' }]"
      :rows="checks.rows"
      :errors="list.errors"
      @add="checks.push({ service: '', path: '/health' })"
      @remove="checks.remove"
    >
      <template #cell="{ row, column, label }">
        <checks.Field :index="row.index" :name="column.key" v-slot="cell">
          <Field><TextInput v-model="cell.value" :aria-label="label" @blur="cell.onBlur" /></Field>
        </checks.Field>
      </template>
    </RowsField>
  </form.Field>
</template>
```

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [RowsField.dom.test.ts](../../../../tests/unit/presentation/forms/RowsField.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
