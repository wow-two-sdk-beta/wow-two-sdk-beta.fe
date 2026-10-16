# Badge

Renders a non-interactive pill marking a status or category.

Source: [Badge.vue](Badge.vue).

Public import: `import { Badge } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Skeleton mode keeps the pill's size, padding and radius and masks its fill and copy; the pill is `aria-hidden`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `BadgeVariant` | no | — | The color treatment. |
| `size` | `Size` | no | — | The size step. |
| `isSkeleton` | `boolean` | no | `undefined` | Draws the pill as its placeholder; defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
