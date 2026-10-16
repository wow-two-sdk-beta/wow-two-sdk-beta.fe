# StackLayout

Renders a vertical (default) or horizontal flex container with gap and alignment variants.

Source: [StackLayout.vue](StackLayout.vue).

Public import: `import { StackLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `ElementType` | no | `'div'` | Declared by the source contract. |
| `direction` | `StackLayoutDirection` | no | — | The flex main-axis direction. Default `column`. |
| `align` | `StackLayoutAlign` | no | — | The cross-axis alignment of children. |
| `justify` | `StackLayoutJustify` | no | — | The main-axis distribution of children. |
| `wrap` | `StackLayoutWrap` | no | — | The child wrapping onto multiple lines. |
| `gap` | `StackLayoutGap` | no | — | The gap between children (Tailwind spacing step). Default `4`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The children laid out along the stack axis. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
