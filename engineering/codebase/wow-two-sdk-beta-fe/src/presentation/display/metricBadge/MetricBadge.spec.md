# MetricBadge

Renders an inline-flex label-value chip with a tone-tinted leading icon and an uppercase label.

Source: [MetricBadge.vue](MetricBadge.vue).

Public import: `import { MetricBadge } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | yes | — | The uppercase mini-LABEL rendered after the icon. Rich content goes through the `label` slot. |
| `value` | `string \| number` | yes | — | The value rendered after the label, tabular-nums. Rich content goes through the `value` slot. |
| `tone` | `MetricBadgeTone` | no | `'neutral'` | The tone tinting the icon and the value. Default `neutral`. |
| `size` | `MetricBadgeSize` | no | `'sm'` | The visual size — drives gap + text-size token. Default `sm`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon?(): unknown;` | The optional leading icon (tone-tinted via the `tone` prop) — the legacy `icon` node prop. |
| `label` | `label?(): unknown;` | The rich override for the `label` prop. |
| `value` | `value?(): unknown;` | The rich override for the `value` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
