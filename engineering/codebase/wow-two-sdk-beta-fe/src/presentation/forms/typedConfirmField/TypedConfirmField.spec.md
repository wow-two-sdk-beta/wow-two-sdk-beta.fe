# TypedConfirmField

Renders a label naming the expected text, a text input, a helper and an error as one field; the reader types the
expected text exactly before a dangerous action runs.

Source: [TypedConfirmField.vue](TypedConfirmField.vue), [UseTypedConfirmation.ts](UseTypedConfirmation.ts).

Public import: `import { TypedConfirmField, useTypedConfirmation } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- A fused field: the SDK `Field` around a `TextInput`, so the label, helper and error wire `for`, `aria-describedby`,
  `aria-invalid` and `required` through the form-control context.
- The typed text is the model: `modelValue` / `update:modelValue`, seeded by `defaultValue`. Send it unchanged as the
  API's `confirm`; the field never trims or folds case.
- It matches only when the typed text equals `expected` exactly; an empty `expected` never matches. The exposed
  `isConfirmed` and the root's `data-confirmed` carry the match, and a polite live region announces `matchedLabel`.
- `label` is a template: `{expected}` renders as `CodeText`, selectable in one click. The `label` slot replaces it.
- The mismatch error waits until the reader leaves the input holding other text, and clears once the text matches; an
  emptied input shows none. `error` replaces it, and either replaces the helper.
- The input turns off autocomplete, autocapitalize, autocorrect and spellcheck, so a phone keyboard cannot alter an
  ID. Pasting stays allowed.
- An uncontrolled field clears its text and the pending mismatch when `expected` changes; a controlled one leaves its
  text to the owner (`useTypedConfirmation` clears it).
- `class` lands on the field root; every other attribute and listener reaches the input.
- Required by default; `isReadOnly` holds the text and focus while the confirmed action runs.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `expected` | `string` | yes | — | The exact text the reader types — the target's ID or name. |
| `modelValue` | `string` | no | `undefined` | The typed text, controlled. The `v-model` binding target. |
| `defaultValue` | `string` | no | `''` | The initial typed text when uncontrolled. |
| `label` | `string` | no | `"Type {expected} to confirm"` | The label template; localized `TypedConfirmField.label`. |
| `helper` | `string` | no | — | The helper beneath the input; `helper` slot is the rich override. |
| `mismatchError` | `string` | no | `"Type {expected} exactly as shown."` | Localized `TypedConfirmField.mismatchError`. |
| `error` | `string` | no | — | An error that replaces the mismatch error. |
| `matchedLabel` | `string` | no | `"The text matches."` | The match announcement; localized `TypedConfirmField.matchedLabel`. |
| `isRequired` | `boolean` | no | `true` | The required state. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state; absent, it follows a surrounding `Field`. |
| `isReadOnly` | `boolean` | no | `undefined` | Keeps the text and focus but blocks changes; absent, it follows a surrounding `Field`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the typed text changes — the `v-model` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown` | The rich override for `label`. |
| `helper` | `helper?(): unknown` | The rich override for `helper`. |

## Exposed handle

`{ el, isConfirmed }` — the rendered `<input>` and whether the typed text matches.

## useTypedConfirmation

`useTypedConfirmation(expected, { isNeeded? })` returns `TypedConfirmationControls`:

| Member | Meaning |
|---|---|
| `typed` | The typed text; bind it to the field's `v-model`. It clears whenever `expected` changes. |
| `isNeeded` | Whether the action asks for the typed confirmation now; `isNeeded` option, default `true`. |
| `isConfirmed` | `true` when not needed, else when `typed` equals `expected` exactly. Gate the action on it. |
| `confirm` | The API's `confirm` value: `typed` while needed, else `undefined`. |
| `reset()` | Clears `typed`; call it when the dialog opens again. |

```vue
<script setup lang="ts">
const { typed, isConfirmed, confirm } = useTypedConfirmation(() => target.value, { isNeeded: () => isProd.value });
</script>
<template>
  <TypedConfirmField v-if="isProd" v-model="typed" :expected="target" />
  <Button :is-disabled="!isConfirmed" @click="deploy({ target, ...(confirm ? { confirm } : {}) })">Deploy</Button>
</template>
```

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [TypedConfirmField.dom.test.ts](../../../../tests/unit/presentation/forms/TypedConfirmField.dom.test.ts)
  — label and code, input attributes, exact matching, mismatch timing, error override, controlled and uncontrolled
  text, reset on a new target, attribute routing, localized and slotted labels, and the hook.
- Keyboard flow inside the dialog: [TypedConfirmModal.browser.test.ts](../../../../tests/unit/presentation/overlays/TypedConfirmModal.browser.test.ts).
