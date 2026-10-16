# InfoRow

Renders one label-value row with an optional leading icon.

Source: [InfoRow.vue](InfoRow.vue).

Public import: `import { InfoRow } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | no | — | The label copy. the scalar form is the prop and the same-named slot is the rich override, so it is optional — a consumer filling `#label` need not also pass the prop. |
| `value` | `string \| number` | no | — | The value copy. Optional for the same reason as `label`. |
| `layout` | `InfoRowLayout` | no | `InfoRowLayout.Inline` | The layout: `inline` puts label-value on one line; `stacked` puts value below. Default `inline`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon?(): unknown;` | The optional icon rendered before the label. |
| `label` | `label?(): unknown;` | The rich override for the `label` prop. |
| `value` | `value?(): unknown;` | The rich override for the `value` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
