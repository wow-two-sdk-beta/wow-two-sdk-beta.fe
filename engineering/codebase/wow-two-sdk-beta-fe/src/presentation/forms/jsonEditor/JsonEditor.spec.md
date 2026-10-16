# JsonEditor

Renders a JSON document as an inline-editable tree or as raw text, switched by a mode toggle.

Source: [JsonEditor.vue](JsonEditor.vue).

Public import: `import { JsonEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `unknown` | no | `undefined` | The document, controlled. The `v-model` binding target. |
| `defaultValue` | `unknown` | no | `undefined` | The initial document when uncontrolled. Defaults to `{}`. |
| `mode` | `JsonEditorMode` | no | `undefined` | The render mode, controlled. The `v-model:mode` binding target. |
| `defaultMode` | `JsonEditorMode` | no | `undefined` | The initial render mode when uncontrolled. Default `tree`. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding form control's `isDisabled`. |
| `isReadOnly` | `boolean` | no | `undefined` | The read-only state. Falls back to the surrounding form control's `isReadOnly`. |
| `isInvalid` | `boolean` | no | `undefined` | The invalid surface override. Falls back to the surrounding form control's `isInvalid`. |
| `indent` | `number` | no | `2` | The `JSON.stringify` indent used by text mode. Default `2`. |
| `minHeight` | `string` | no | `'14rem'` | The CSS minHeight on the surface (default `14rem`). |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: unknown];` | Fires when the reader edits the document — the `v-model` half. |
| `update:mode` | `'update:mode': [mode: JsonEditorMode];` | Fires when the reader picks a different mode — the `v-model:mode` half. |

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
