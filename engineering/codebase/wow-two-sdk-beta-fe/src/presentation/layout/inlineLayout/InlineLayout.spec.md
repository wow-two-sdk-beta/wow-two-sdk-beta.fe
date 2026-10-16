# InlineLayout

Renders a wrapping horizontal row with a consistent gap.

Source: [InlineLayout.vue](InlineLayout.vue).

Public import: `import { InlineLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `gap` | `'0' \| '1' \| '2' \| '3' \| '4' \| '6' \| '8'` | no | `'2'` | The gap between children (Tailwind spacing). Default `2`. |
| `align` | `InlineLayoutAlign` | no | `InlineLayoutAlign.Center` | The vertical alignment. Default `center`. |
| `canWrap` | `boolean` | no | `true` | The child wrapping onto multiple lines. Default `true` (`flex-wrap`). Set `false` (`flex-nowrap`) for tight single-line rows that should truncate. |
| `wrap` | `boolean` | no | —      | Deprecated — use `canWrap`; removed next release.                                                                                                  |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The items laid out in the wrapping row. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
