# Grid

Renders a CSS grid container with column and gap variants.

Source: [Grid.vue](Grid.vue).

Public import: `import { Grid } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `ElementType` | no | `'div'` | Declared by the source contract. |
| `columns` | `GridColumns \| GridResponsive<GridColumns>` | no | `'2'` | The equal-column track count. Scalar (`'3'`) emits `grid-cols-3`; a responsive map (`{ base: '1', md: '2', lg: '3' }`) emits per-breakpoint prefixed classes. Default `'2'`. |
| `gap` | `GridGap \| GridResponsive<GridGap>` | no | `'4'` | The gap between tracks. Scalar (`'4'`) emits `gap-4`; a responsive map (`{ base: '2', lg: '6' }`) emits per-breakpoint prefixed classes. Default `'4'`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The grid items. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
