# Card

Renders a raised surface that groups content, padded to frame its header, body, and footer.

Source: [Card.vue](Card.vue).

Public import: `import { Card } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Skeleton mode keeps the surface, radius, padding and shadow; `CardTitle`, `CardDescription` and every SDK component
  inside draw their own skeletons. An explicit `isSkeleton` sets `aria-busy`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `ambient` | `SurfaceAmbient` | no | — | The optional ambient surface treatment: `sheen`, `glow`, or `bevel`. |
| `variant` | `SurfaceVariant` | no | — | The visual recipe — solid · soft · surface · outline · glass · elevated · flat · subtle. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps the chrome and switches every component inside to its skeleton; defaults to the nearest `DataRegion` first load. |

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
