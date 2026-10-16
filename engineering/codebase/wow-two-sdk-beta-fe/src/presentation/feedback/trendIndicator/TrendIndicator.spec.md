# TrendIndicator

Renders an up / down / flat arrow beside a value and an optional label.

Source: [TrendIndicator.vue](TrendIndicator.vue).

Public import: `import { TrendIndicator } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `number` | yes | — | The numeric delta — sign drives direction. |
| `format` | `(value: number) => string` | no | — | The optional value formatter (default: `${sign}${value}%`). Rich content → the `value` slot. |
| `isInverse` | `boolean` | no | — | The inverse-direction flag — when `true`, an increase reads as bad (e.g. error rate, churn). |
| `label` | `string` | no | — | The small trailing label, e.g. "vs last week". Rich content → the `label` slot. |
| `size` | `Size` | no | `SizeToken.Sm` | The text + icon scale. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `value` | `value?(props: { value: number; display: string }): unknown;` | The formatted delta — receives the raw `value` and its `display` string. |
| `label` | `label?(): unknown;` | The trailing label. Falls back to the `label` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
