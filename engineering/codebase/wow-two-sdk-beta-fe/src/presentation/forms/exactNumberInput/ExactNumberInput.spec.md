# ExactNumberInput

Text editing for exact decimal values without native-number conversion.
Public import: `import { ExactNumberInput } from '@wow-two-beta/ui-vue/presentation/forms'`.
Source: [ExactNumberInput.vue](ExactNumberInput.vue).

## Model and draft

- `modelValue`/`update:modelValue` owns a committed `ExactNumber | null` value.
- `defaultValue` seeds uncontrolled state once. Controlled ownership follows the shared fixed-mode contract.
- Typing changes a separate text draft. Blur or Enter commits a complete value; Escape discards the draft.
- Empty text commits null. Accepted nonempty text is one JSON numeric token, such as `-12.5` or `1.25e3`.
- Editing uses ASCII digits, dot decimals and optional decimal exponents. Grouping, comma decimals,
  leading plus, surrounding whitespace, `.5`, `1.`, NaN and Infinity do not commit.
- Incomplete/invalid text stays visible, emits `invalid`, sets native custom validity and `aria-invalid`,
  and leaves the committed model untouched. It becomes editable without retaining stale errors.
- Native Enter submission is prevented when the current draft fails to commit.
- External model changes replace dirty drafts without emitting user intent.
- A controlled caller that declines a valid update keeps its existing model/visible committed value.
- IME Enter does not commit until composition finishes. Disabled/readonly controls reject synthetic editing too.
- Locale display formatting belongs to the exact-number formatters; editable wire syntax remains unambiguous.

## Props and events

- Value props: `modelValue?`, `defaultValue?`: `ExactNumber | null`.
- Shared input props: `size`, `state`, `border`, `ring`, `id`, `isDisabled`, `isRequired`, `isReadOnly` (deprecated aliases `disabled`, `required`, `readonly`, `readOnly` are removed next release).
- `invalidMessage?`: native validity text; omitted text resolves from `ExactNumberInput.invalidMessage`.
- `update:modelValue(value)` reports a committed model update.
- `draft-change(text)` reports editable text without claiming numeric validity.
- `invalid(failure, text)` reports the SDK NumberFailure and rejected draft.

## Native and Field integration

- The native control is `input[type=text]` with `inputmode=decimal`.
- Field id/disabled/readonly/required/descriptive/invalid context is inherited; explicit flags override defaults.
- Native `name`, `form`, autocomplete, placeholder and event attributes forward to the input.
- Caller `aria-describedby` is combined with Field descriptions.
- Native form reset restores the seed through the state owner and clears drafts/validity;
  cancelled resets preserve the draft. Controlled resets respect the caller's resulting value.
- Exposed handle: `{ el, commit, restore }`. `commit()` returns Result; `restore()` discards the current draft.

## Verification

`tests/unit/presentation/forms/ExactNumberInput.dom.test.ts` covers long exact decimals, invalid drafts,
Enter/blur/Escape, clear, external updates, controlled acceptance/rejection, Field attributes,
native resets, IME and translated browser validity text.
