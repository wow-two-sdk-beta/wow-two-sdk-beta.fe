# Heading

Renders a semantic heading whose tag (`h1`-`h6`) and visual size are set independently.

Source: [Heading.vue](Heading.vue).

Public import: `import { Heading } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Skeleton mode keeps the heading element, its level and its line height: the text stays mounted but transparent
  under one bar per line, as wide as the text, `skeletonWidth`, or `8em` when empty.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `level` | `HeadingLevel` | no | `2` | The semantic heading level (1–6). Default 2. Visual size is independent — set via `size`. |
| `size` | `HeadingSize` | no | — | The visual size step. |
| `weight` | `HeadingWeight` | no | — | The font weight. |
| `align` | `HeadingAlign` | no | — | The text alignment. |
| `isSkeleton` | `boolean` | no | `undefined` | Draws the heading as bars; defaults to the nearest `DataRegion` first load. |
| `skeletonWidth` | `string` | no | — | The skeleton bar's width, any CSS length; defaults to the heading's own width. |

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
