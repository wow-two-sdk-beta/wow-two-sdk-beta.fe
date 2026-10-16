# FieldHelperText

Renders the hint text under a form control, registering its id with the control's `aria-describedby`.

Source: [FieldHelperText.vue](FieldHelperText.vue).

Public import: `import { FieldHelperText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Inside a `DataRegion` first load or a skeleton `Field`, the hint keeps its lines and its copy turns into bars.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | `string` | no | — | The node's own id. An explicit id detaches it from the context's `helperId`, so the control's `aria-describedby` stops referencing it. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The hint copy — the default slot. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
