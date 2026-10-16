# ClusterLayout

Renders a centered wrapping row — for auth-page action clusters, hero CTAs, footer link groups.

Source: [ClusterLayout.vue](ClusterLayout.vue).

Public import: `import { ClusterLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `gap` | `'2' \| '3' \| '4' \| '6' \| '8'` | no | `'4'` | The gap between children. Default `4`. |
| `justify` | `Align` | no | `Align.Center` | The cross-axis justification. Default `center`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The items laid out in the centered wrapping row. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
