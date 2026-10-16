# ControlGroupField

Renders a labelled group of controls — a muted label bound to its control(s), laid out horizontally (label beside) or vertically (label above).

Source: [ControlGroupField.vue](ControlGroupField.vue).

Public import: `import { ControlGroupField } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | yes | — | The group's label — muted; sits beside the control(s) when horizontal, above them when vertical. a Vue prop renders text, so richer content goes through the same-named `label` slot, which overrides this value. |
| `orientation` | `Orientation` | no | `Orientation.Horizontal` | The label-to-control layout — `horizontal` (label beside) or `vertical` (label above). Default `horizontal`. |
| `hasDivider` | `boolean` | no | `true` | The hairline between this and the next group (settings-list look). Default `true`. |
| `divided` | `boolean` | no | —      | Deprecated — use `hasDivider`; removed next release.                               |
| `labelWidth` | `string` | no | `undefined` | The fixed label width in the horizontal layout, e.g. `"6rem"` — aligns rows. Omit for content-driven width. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | Rich-content override for the `label` prop. |
| `default` | `default(): unknown;` | The control(s) bound to the label — the default slot. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
