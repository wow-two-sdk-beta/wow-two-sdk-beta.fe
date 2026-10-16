# LabelText

Renders a `<label>` that takes `htmlFor` and `id` from `FormControl`, plus the required-field asterisk.

Source: [LabelText.vue](LabelText.vue).

Public import: `import { LabelText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Inside a `DataRegion` first load or a skeleton `Field`, the label keeps its line and its copy turns into a bar;
  the required asterisk keeps its space but hides.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isRequired` | `boolean` | no | `undefined` | The required state, showing a `*` indicator. Auto-derived from `FormControl.isRequired` when present. |
| `size` | `Size` | no | `SizeValue.Md` | The visual size. Default `md`. |
| `htmlFor` | `string` | no | — | The id of the labelled control — the legacy `htmlFor`. Auto-filled from `FormControl` context when omitted. |
| `for` | `string` | no | — | The DOM spelling of {@link LabelTextProps.htmlFor}, which wins when both are set. |
| `id` | `string` | no | — | The label's own id. An explicit id detaches the node from the context's `labelId`, so the label stops registering as the context's naming chrome. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The label copy, rendered before the required asterisk. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
