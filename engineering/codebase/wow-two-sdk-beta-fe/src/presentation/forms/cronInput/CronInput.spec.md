# CronInput

Renders a cron-string input with a live plain-English preview of when the expression fires.

Source: [CronInput.vue](CronInput.vue).

Public import: `import { CronInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the state owner and restores the resulting DOM representation; a cancelled reset changes nothing.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Five POSIX fields; each takes `*`, `N`, `*/N`, `N-M` or `N,M,…`. The weekday field accepts 0–7, where 0 and 7 are Sunday.
- The preview names common shapes (every N minutes or hours, daily at a time, at a time on listed or ranged weekdays)
  and otherwise describes each constrained field. A malformed expression sets `aria-invalid`; an empty one does not —
  emptiness is `isRequired`'s call — and shows no preview.
- Regression: `tests/unit/presentation/forms/CronInput.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `size` | `InputSize` | no | — | The control size. |
| `state` | `InputState` | no | — | The validity surface. |
| `modelValue` | `string` | no | `undefined` | The cron string, controlled. The `v-model` binding target. |
| `defaultValue` | `string` | no | — | The initial cron string when uncontrolled. Defaults to the every-5-minutes expression. |
| `placeholder` | `string` | no | `'* * * * *'` | The empty-state placeholder. |
| `isInvalid` | `boolean` | no | `undefined` | The invalid surface override. Falls back to the surrounding form control's `isInvalid`. |
| `hasPreview` | `boolean` | no | `true` | Whether the human-readable readout renders under the input. Default `true`. |
| `id` | `string` | no | — | The control's id. Auto-filled from `FormControl` context when omitted. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isReadOnly` | `boolean` | no | `undefined` | Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. |
| `readOnly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `readonly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `isRequired` | `boolean` | no | `undefined` | The required state. Falls back to the surrounding field's `isRequired`. |
| `required` | `boolean` | no | `undefined` | Deprecated alias of `isRequired`; removed next release. |
| `name` | `string` | no | — | The hidden input name; the hidden input emits the cron string. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader edits the cron expression. The `v-model` half. |

## Slots

None declared.

## Exposed handle

`{ el: input }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
