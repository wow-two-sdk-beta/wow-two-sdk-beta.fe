# Field

Renders label, control, helper and error as one block, wiring the control through form-control context.

Source: [Field.vue](Field.vue).

Public import: `import { Field } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Skeleton mode keeps the label line, the control's height and radius and the helper lines; one flag here switches
  every part inside.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The label text. Fill the `label` slot instead for richer content (e.g. label + tooltip). |
| `helper` | `string \| number` | no | — | The helper / hint shown beneath the control. Hidden while errors show. |
| `error` | `string \| number` | no | — | The error text — renders only when truthy. Sets `isInvalid` on the form context. Inside a forms-engine `Field` this is an OVERRIDE: leave it unset and the field's own errors (client + server, all of them) render automatically. |
| `isRequired` | `boolean` | no | `undefined` | The required state (also exposes `isRequired` to the control via context). |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state (also exposes `isDisabled` to the control). |
| `isReadOnly` | `boolean` | no | `undefined` | The read-only state (also exposes `isReadOnly` to the control). |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps the layout; the label, control and helper each draw their own skeleton. An explicit `true` sets `aria-busy`. Defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | See the declared signature. |
| `label` | `label?(): unknown;` | See the declared signature. |
| `helper` | `helper?(): unknown;` | See the declared signature. |
| `error` | `error?(): unknown;` | See the declared signature. |

## Read-only look

A read-only control (its own `isReadOnly`, or the Field's) takes the disabled look without the disabled semantics: the muted surface and text, a default cursor, no hover border, and a 1px neutral focus ring in place of the brand ring. The control stays focusable, its value stays selectable and copyable, and it never opens a panel, starts a recording or changes. The `readonly:` variant in `index.css` carries the styling: it matches `[readonly]`, `[aria-readonly='true']` and `[data-readonly]`, never a `<button>` or a disabled field as Tailwind's `read-only:` does.

The state reaches assistive technology through a role that allows it, never through an `aria-readonly` the role forbids:

- An input or text area carries the native `readonly` attribute.
- A `combobox` trigger (`SelectPicker`, `MultiSelectPicker`) carries `aria-readonly="true"`. `role="combobox"` on the trigger button, with `aria-haspopup="listbox"`, `aria-expanded` and `aria-controls`, is the APG select-only combobox; it opens on Enter, Space and the arrow keys, and ignores all of them while read-only.
- A `button`, `group`, `img`, `radio` or drop-zone control has no `aria-readonly`, so it carries `data-readonly` for the styling and is described as "Read only" (`Field.readOnly` in the locale catalogue) through `aria-describedby`, beside any helper text. This covers the picker triggers that open a dialog (`DatePicker`, `DateRangePicker`, `TimePicker`, `MonthPicker`, `YearPicker`, `CascaderPicker`, `TreeSelectPicker`, `ColorPicker`, `FontPicker`, `EmojiPickerPopover`), `FilePicker`, `FileUploadPicker`, `KeyboardShortcutPicker`, `IconPicker`, `ColorSwatchPicker`, `GradientPicker`, `SignatureInput` and `RadioInput`.
- A `slider`, `listbox`, `checkbox` and `switch` keep `aria-readonly`, which their roles allow.

Internally, `useReadOnlyHint` and `ReadOnlyHint` supply the description; a control that needs one renders `ReadOnlyHint` beside itself. Verified by [ReadOnlyState.browser.test.ts](../../../../tests/unit/presentation/forms/ReadOnlyState.browser.test.ts) (inputs and the popover pickers), [ReadOnlyControls.browser.test.ts](../../../../tests/unit/presentation/forms/ReadOnlyControls.browser.test.ts) (the other controls) and [ReadOnlyAria.dom.test.ts](../../../../tests/unit/presentation/forms/ReadOnlyAria.dom.test.ts), which runs the ARIA validity rules over every public control that takes `isReadOnly`.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DateTimeControls.dom.test.ts](../../../../tests/unit/presentation/forms/DateTimeControls.dom.test.ts), [Forms.contract.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
