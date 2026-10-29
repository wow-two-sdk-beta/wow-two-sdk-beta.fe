# TypedConfirmModal

Renders a centred alert dialog — a bottom sheet on phones — that asks the reader to type a target's ID before a
dangerous action runs; the confirm button stays disabled until the typed text matches exactly. Without `expected` it
is a plain confirm that still awaits the action.

Source: [TypedConfirmModal.vue](TypedConfirmModal.vue).

Public import: `import { TypedConfirmModal } from '@wow-two-beta/fe/presentation/overlays';`.

## Contract

- An `AlertModal` (`role="alertdialog"`, no outside-click dismissal) named by `title` and described by `description`.
- The body holds the default slot — facts, risks, a reason field — then a `TypedConfirmField` for `expected`, then an
  `Alert` (`role="alert"`) with `error` when set. Cancel precedes Confirm in the footer.
- Focus lands on the first control on open: the typed field, unless the default slot holds an earlier one.
- The open state uses the shared controlled-state helper: `open` / `update:open`, seeded by `defaultOpen`.
- The typed text clears each time the dialog opens and whenever `expected` changes.
- Confirm stays disabled until the typed text equals `expected`; Enter in the field confirms through the form.
- Without `expected` the dialog renders no typed field, and `onConfirm` receives an empty string; one call site serves
  a target that needs the typed ID and one that does not.
- `canConfirm` gates Confirm beside the typed match — keep it `false` while a required default-slot input is empty.
- The `confirm-icon` slot fills the confirm button's leading icon; the busy spinner replaces it while pending.
- `onConfirm(typed)` receives the typed text for the API's `confirm`; `@confirm` binds it.
- A returned promise keeps the dialog open until it settles: a busy confirm button, `aria-busy`, a read-only field
  that keeps focus, a disabled Cancel and no Escape dismissal.
- The dialog closes when `onConfirm` returns or resolves anything but a failed `Result`.
- A throw, a rejection or a failed `Result` keeps it open with the typed text and emits `error` with the error or the
  `Result`'s failure. Show the API's reason through `error`, e.g. `ApiFailureExtensions.reason(failure)`.
- `cancel` fires for every dismissal of an open dialog — Cancel or Escape — and never after a confirm.
- A result that settles after unmount, or after a newer confirm, is ignored.
- Attributes and `class` reach `AlertModalContent`.
- Use `ConfirmPopover` when a plain confirm suffices; use `TypedConfirmField` directly inside a larger dialog or form.

## Props

| Prop           | Type                         | Required | Default               | Meaning                                                                   |
| -------------- | ---------------------------- | -------- | --------------------- | ------------------------------------------------------------------------- |
| `open`         | `boolean`                    | no       | `undefined`           | The open state, controlled. The `v-model:open` binding target.            |
| `defaultOpen`  | `boolean`                    | no       | `false`               | The initial open state when uncontrolled.                                 |
| `title`        | `string`                     | yes      | —                     | The question the dialog asks; it names the dialog.                        |
| `description`  | `string`                     | no       | `undefined`           | The consequence under the title; `description` slot is the rich override. |
| `expected`     | `string`                     | no       | `undefined`           | The text the reader types to enable the action; omitted, no typed field.  |
| `canConfirm`   | `boolean`                    | no       | `true`                | Whether the action may run, beside the typed match.                       |
| `label`        | `string`                     | no       | `TypedConfirmField`'s | The field's label template; `{expected}` marks the expected text.         |
| `helper`       | `string`                     | no       | —                     | The helper beneath the field.                                             |
| `error`        | `string`                     | no       | —                     | The refusal shown under the field.                                        |
| `confirmLabel` | `string`                     | no       | `"Confirm"`           | The confirm text; localized `TypedConfirmModal.confirmLabel`.             |
| `cancelLabel`  | `string`                     | no       | `"Cancel"`            | The cancel text; localized `TypedConfirmModal.cancelLabel`.               |
| `tone`         | `ColorTone`                  | no       | `'danger'`            | The confirm button tone.                                                  |
| `onConfirm`    | `(typed: string) => unknown` | no       | —                     | Runs on confirm with the typed text; a returned promise is awaited.       |

## Emits

| Event         | Signature                         | Meaning                                                                 |
| ------------- | --------------------------------- | ----------------------------------------------------------------------- |
| `update:open` | `'update:open': [open: boolean];` | Fires when the dialog opens or closes — the `v-model:open` half.        |
| `cancel`      | `cancel: [];`                     | Fires when the reader dismisses without confirming.                     |
| `error`       | `error: [error: unknown];`        | Fires when `onConfirm` throws, rejects or settles to a failed `Result`. |

## Slots

| Slot          | Signature                 | Meaning                                                          |
| ------------- | ------------------------- | ---------------------------------------------------------------- |
| `default`     | `default?(): unknown`     | What the reader weighs before confirming, above the typed field. |
| `description` | `description?(): unknown` | The rich override for `description`.                             |
| `confirm-icon` | `'confirm-icon'?(): unknown` | The confirm button's leading icon.                            |

## Exposed handle

No explicit exposed handle.

```vue
<TypedConfirmModal
  v-model:open="open"
  :title="`Revoke ${key.name}?`"
  description="Integrations using it stop at once."
  :expected="key.name"
  :error="refusal"
  confirm-label="Revoke"
  @confirm="(confirm) => revoke({ id: key.id, confirm })"
  @error="(failure) => (refusal = ApiFailureExtensions.reason(failure))"
/>
```

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts).
- Focused tests: [TypedConfirmModal.dom.test.ts](../../../../tests/unit/presentation/overlays/TypedConfirmModal.dom.test.ts)
  — naming, initial focus, exact matching, Enter, sync and async confirm, busy state, rejection and failed `Result`,
  the `error` prop, cancel paths, clearing on reopen and on a new target, localized text.
- Real-browser flow: [TypedConfirmModal.browser.test.ts](../../../../tests/unit/presentation/overlays/TypedConfirmModal.browser.test.ts)
  — keyboard typing, Enter, focus return to the trigger, the mismatch after Tab and the code face.
