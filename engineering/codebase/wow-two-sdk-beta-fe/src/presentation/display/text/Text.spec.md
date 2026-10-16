# Text

Renders body text as a `<p>`, or as any element given to `as` to match surrounding semantics.

Source: [Text.vue](Text.vue).

Public import: `import { Text } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Skeleton mode keeps the element and its line height: the text stays mounted but transparent under one bar per
  line, as wide as the text, `skeletonWidth`, or `8em` when empty. The bar is `aria-hidden`; the root carries
  `data-skeleton`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `ElementType` | no | `'p'` | Declared by the source contract. |
| `size` | `Size` | no | — | The font size step. |
| `weight` | `TextWeight` | no | — | The font weight. |
| `color` | `TextColor` | no | — | The color role. |
| `align` | `TextAlign` | no | — | The text alignment. |
| `isTruncated` | `boolean` | no | `undefined` | The single-line truncation with an ellipsis. |
| `isTabular` | `boolean` | no | `undefined` | The tabular (fixed-width) figures treatment. |
| `isSkeleton` | `boolean` | no | `undefined` | Draws the text as bars; defaults to the nearest `DataRegion` first load. |
| `skeletonWidth` | `string` | no | — | The skeleton bar's width, any CSS length; defaults to the text's own width. |

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
- Focused test references: [MotionControls.dom.test.ts](../../../../tests/unit/presentation/display/MotionControls.dom.test.ts), [EditingBehavior.dom.test.ts](../../../../tests/unit/presentation/forms/EditingBehavior.dom.test.ts), [Forms.contract.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.contract.dom.test.ts), [InputInteraction.dom.test.ts](../../../../tests/unit/presentation/forms/InputInteraction.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
