# ButtonGroup

Renders a row or column of related buttons, collapsing their inner radii into one connected control.

Source: [ButtonGroup.vue](ButtonGroup.vue).

Public import: `import { ButtonGroup } from '@wow-two-beta/ui-vue/presentation/actions';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ HTMLAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `orientation` | `Orientation` | no | `OrientationValue.Horizontal` | The visual orientation. Default `horizontal`. |
| `isAttached` | `boolean` | no | `true` | The attached state — groups children with collapsed inner radii (connected look). Default `true`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The buttons the group lays out and joins into one connected control. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
