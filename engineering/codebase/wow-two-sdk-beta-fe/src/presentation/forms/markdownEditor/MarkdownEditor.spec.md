# MarkdownEditor

Renders a markdown pane, a formatting toolbar and a sanitized live preview, in split, edit or preview view.

Source: [MarkdownEditor.vue](MarkdownEditor.vue).

Public import: `import { MarkdownEditor } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- Default preview escapes raw HTML and filters link/image URL schemes with UrlExtensions.
- `showImages=false` renders Markdown image alternative text only; the default preview creates no image elements.
  Raw HTML remains escaped. The custom preview slot is caller-owned and is not filtered by this option.
- The preview slot replaces this renderer; its caller owns the trust policy for any custom HTML.
- URL bindings select an allowed scheme through UrlExtensions before rendering. Custom slots remain caller-owned content.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string` | no | `undefined` | The markdown source, controlled. The `v-model` binding target. |
| `defaultValue` | `string` | no | — | The initial markdown source when uncontrolled. |
| `view` | `MarkdownEditorView` | no | `undefined` | The pane layout, controlled. The `v-model:view` binding target. |
| `defaultView` | `MarkdownEditorView` | no | `undefined` | The initial pane layout when uncontrolled. Default `split`. |
| `isInvalid` | `boolean` | no | `undefined` | The invalid surface override. Falls back to the surrounding form control's `isInvalid`. |
| `showImages` | `boolean` | no | `true` | Allows image elements in the built-in preview; false renders alternative text only. |
| `minHeight` | `string` | no | `'18rem'` | The CSS minHeight on the surface (default `18rem`). |
| `id` | `string` | no | — | The control's id. Auto-filled from `FormControl` context when omitted. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `isReadOnly` | `boolean` | no | `undefined` | Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. |
| `readOnly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `readonly` | `boolean` | no | `undefined` | Deprecated alias of `isReadOnly`; removed next release. |
| `isRequired` | `boolean` | no | `undefined` | The required state. Falls back to the surrounding field's `isRequired`. |
| `required` | `boolean` | no | `undefined` | Deprecated alias of `isRequired`; removed next release. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader edits the markdown, by typing or via a toolbar action — the `v-model` half. |
| `update:view` | `'update:view': [view: MarkdownEditorView];` | Fires when the reader picks a different pane layout — the `v-model:view` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `preview` | `preview?(props: { markdown: string }): unknown;` | Replaces the rendered preview pane. Filling it opts out of the built-in `marked` render, and the consumer owns sanitizing. |

## Exposed handle

`{ el: textarea }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [PreviewTrust.dom.test.ts](../../../../tests/unit/presentation/forms/PreviewTrust.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
