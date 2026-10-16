# TiltLayout

Renders children on a 3D tilt that follows the cursor through `rotateX` / `rotateY`.

Source: [TiltLayout.vue](TiltLayout.vue).

Public import: `import { TiltLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `maxAngle` | `number` | no | `12` | The maximum rotation in degrees at the edges. Default `12`. |
| `perspective` | `number` | no | `800` | The px perspective depth. Default `800`. |
| `hasGlare` | `boolean` | no | `undefined` | The cursor-following highlight. |
| `scale` | `number` | no | `1` | The scale applied while tilted. Default `1`. |
| `as` | `ElementTag` | no | `'div'` | The rendered tag. Default `div`. |

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
