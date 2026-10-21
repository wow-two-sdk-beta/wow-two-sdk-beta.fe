# SurfaceLayout

Renders a styled visual surface composed from the `surfaceVariants` matrix.

Source: [SurfaceLayout.vue](SurfaceLayout.vue).

Public import: `import { SurfaceLayout } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- The glass recipes read the theme's glass strength: `glass` and `glass-outline` take `--glass-fill` (unset, the
  popover at 70%), `--glass-blur` and `--glass-saturate`; `glass-side` and `glass-menu` paint the sidebar and menu
  materials, opaque where blur is unavailable or `prefers-reduced-transparency` asks.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `ElementType` | no | `'div'` | The HTML element to render; defaults to `div`. |
| `asChild` | `boolean` | no | `false` | The merge of styles onto the immediate child instead of rendering a wrapper. |
| `variant` | `SurfaceVariant` | no | — | The visual recipe — solid · soft · surface · outline · glass · glass-outline · glass-side · glass-menu · elevated · flat · subtle. |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The content rendered on the surface. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
