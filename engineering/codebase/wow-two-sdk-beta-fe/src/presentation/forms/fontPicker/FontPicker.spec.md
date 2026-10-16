# FontPicker

Renders a font-family picker whose every option row previews itself in its own face.

Source: [FontPicker.vue](FontPicker.vue).

Public import: `import { FontPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string` | no | `undefined` | The selected font family, controlled. The `v-model` binding target. |
| `defaultValue` | `string` | no | — | The initial font family when uncontrolled. Defaults to the first entry in `fonts`. |
| `fonts` | `ReadonlyArray<FontOption>` | no | `() => BuiltInFonts` | The selectable font set. Defaults to {@link BuiltInFonts}. |
| `placeholder` | `string` | no | `'Select font…'` | The trigger text shown when the value matches no known font. |
| `previewText` | `string` | no | `'The quick brown fox'` | The sample string rendered in each row's own face, unless the option carries its own `sample`. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `name` | `string` | no | — | The hidden form input name; the hidden input emits the selected family. |
| `id` | `string` | no | — | The control's id — it lands on the trigger button. Auto-filled from `FormControl` context. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [family: string];` | Fires when the reader picks a different font — the `v-model` half. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
