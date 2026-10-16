# LabeledField

Renders a `LabelText` above its control with no helper, error or context wiring — for compact inline forms.

Source: [LabeledField.vue](LabeledField.vue).

Public import: `import { LabeledField } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The label text. Fill the `label` slot instead for richer content. |
| `trailing` | `string \| number` | no | — | The optional inline-end label (e.g. "Optional"). Fill the `trailing` slot for richer content. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(props: { id: string }): unknown;` | See the declared signature. |
| `label` | `label?(): unknown;` | See the declared signature. |
| `trailing` | `trailing?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
