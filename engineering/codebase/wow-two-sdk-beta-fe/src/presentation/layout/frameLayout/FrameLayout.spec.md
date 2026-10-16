# FrameLayout

Renders a bordered shell with padding and radius — `Card` without slot semantics.

Source: [FrameLayout.vue](FrameLayout.vue).

Public import: `import { FrameLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `padding` | `'0' \| '2' \| '3' \| '4' \| '6' \| '8'` | no | `'4'` | The padding. Default `4`. |
| `radius` | `Radius` | no | `Radius.Md` | The border radius. Default `md`. |
| `surface` | `FrameLayoutSurface` | no | `FrameLayoutSurface.Card` | The surface background — `card` (raised) or `muted` (recessed). Default `card`. |
| `isBordered` | `boolean` | no | `true` | The border visibility. Default `true`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The content inside the bordered shell. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
