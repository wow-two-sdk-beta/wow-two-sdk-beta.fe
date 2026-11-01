# PhoneInput

Renders a country dial-code select beside a national-number field, emitting one E.164 string.

Source: [PhoneInput.vue](PhoneInput.vue).

Public import: `import { PhoneInput } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- The value is E.164: the selected dial code joined to the national digits (`+998996632582`); it never carries a mask
  character.
- The national field takes digits only. Every other typed or pasted character is dropped from the field itself, not
  only from the value, and digits stop at the country's national length: typing `99663258234234sdfsdfsdf` under
  Uzbekistan leaves `99-663-25-82`.
- The field shows the national digits through the country's mask from `foundation/phone` `PhoneFormats`
  (`XX-XXX-XX-XX` for Uzbekistan, `(XXX) XXX-XXXX` for the US). A separator appears only once a digit follows it. A
  country without a format shows three-digit groups and stops at the E.164 cap of 15 digits.
- The caret stays after the digit it followed when a separator appears or moves. Backspace or Delete next to a
  separator removes the digit beyond it.
- A paste starting with `+` is an international number. It replaces the whole field, and its dial code picks the
  country among `countries`. A number whose dial code no allowed country has keeps all its digits, as a disallowed
  prefix does (below). Digits pasted without `+` that are exactly the selected country's dial code and a full national
  number (`998996632582`) lose the dial code. Any other paste inserts its digits at the caret. Autofilled or dropped
  text starting with `+` reads the same way.
- The control formats; it does not validate. Pair it with `phone({ countries })` from `foundation/validators` in the
  form schema: it fails a short or overlong national number with code `phone` and the expected length per country.
- With no national digits the value is empty — a dial code alone never submits or satisfies `required`. The chosen
  country is kept, including a shared dial code (`+1` for the US or Canada).
- A value's country is read from its longest matching dial code (`+420` before `+42…`). A shared code (`+1` for the US
  and Canada, `+7` for Russia and Kazakhstan) reads as the earlier country in the list, unless the reader picked the other.
- `countries` limits the select to the listed ISO codes, in the order given. Unknown and repeated codes are ignored; a
  list with no known code reads as absent.
- With one allowed country there is no select: its flag and dial code render as a fixed prefix.
- The frame is the medium input height (`h-10`, 40px with its border), the same as every other input; the select,
  the prefix and the number field fill it.
- `focus` fires when focus enters the control from outside it, `blur` when focus leaves the whole control (for the
  body included). Moving between the country select and the number field fires neither, so a form engine bound to
  `@blur` validates once, when the reader leaves the phone number.
- A `defaultCountry` outside the list gives way to the first allowed country.
- A value whose dial prefix matches no allowed country keeps all its digits, unmasked, under the fallback country; the
  select never shows a disallowed country, and the value is not rewritten until the reader edits.
- Regression: `tests/unit/presentation/forms/PhoneInput.dom.test.ts`; the edit and caret rules in
  `tests/unit/foundation/phone/PhoneNumbers.test.ts`; the rule in `tests/unit/foundation/validators/Phone.test.ts`.
- `PhoneCountries` and `PhoneCountry` live in `foundation/phone`; this component's barrel re-exports them.

## Props

| Prop             | Type                    | Required | Default         | Meaning                                                                                                       |
| ---------------- | ----------------------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------- |
| `modelValue`     | `string`                | no       | `undefined`     | The E.164 value, controlled. The `v-model` binding target.                                                    |
| `defaultValue`   | `string`                | no       | —               | The initial E.164 value when uncontrolled.                                                                    |
| `defaultCountry` | `string`                | no       | `'US'`          | The ISO code selected before the value carries a recognisable dial prefix. Default `US`.                      |
| `countries`      | `ReadonlyArray<string>` | no       | —               | The ISO codes the reader may pick, in display order; unknown codes are ignored. Default every known country.  |
| `isDisabled`     | `boolean`               | no       | `undefined`     | The disabled state. Falls back to the surrounding form control's `isDisabled`.                                |
| `isReadOnly`     | `boolean`               | no       | `undefined`     | The read-only state. Falls back to the surrounding form control's `isReadOnly`.                               |
| `isInvalid`      | `boolean`               | no       | `undefined`     | The invalid surface override. Falls back to the surrounding form control's `isInvalid`.                       |
| `placeholder`    | `string`                | no       | mask with zeros | The national-number placeholder. Default the country's mask with zeros (`00-000-00-00`), none without a mask. |
| `name`           | `string`                | no       | —               | The hidden input name; the hidden input emits the full E.164 value.                                           |

## Emits

| Event               | Signature                              | Meaning                                                                          |
| ------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [e164: string];` | Fires when the reader edits the number or switches country — the `v-model` half. |
| `focus`             | `focus: [event: FocusEvent];`          | Fires when focus enters the control from outside it.                             |
| `blur`              | `blur: [event: FocusEvent];`           | Fires when focus leaves the whole control.                                       |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Native input attributes and event listeners (including `name`, `form`, `autocomplete`, `onInput` and keyboard/composition/clipboard events) are represented in the public props type. They remain fallthrough attrs at runtime, except `onFocus` and `onBlur`, which bind the `focus` and `blur` emits of the whole control. Canonical model value, visual size, fixed native type and declared Temporal bounds retain component ownership. Autocomplete accepts its native extensible token string.
