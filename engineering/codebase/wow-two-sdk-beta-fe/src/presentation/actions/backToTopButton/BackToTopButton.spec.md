# BackToTopButton

Renders a floating button that appears past a scroll threshold and returns the page to the top.

Source: [BackToTopButton.vue](BackToTopButton.vue).

Public import: `import { BackToTopButton } from '@wow-two-beta/ui-vue/presentation/actions';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ ButtonHTMLAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `threshold` | `number` | no | `400` | The scroll distance (px) before the button appears. Default 400. |
| `scrollContainer` | `HTMLElement \| null` | no | `null` | The scrollable element to scope to. Defaults to the window. |
| `position` | `OverlayPosition` | no | `OverlayPositionValue.BottomRight` | The anchor position on the viewport. Default `bottom-right`. |
| `label` | `VNodeChild` | no | `undefined` | The visible label. Omit for icon-only. Prefer the `label` named slot. |
| `type` | `ButtonType` | no | `ButtonType.Button` | The button type. Default `ButtonType.Button`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | The visible label beside the arrow. Falls back to the `label` prop, then to icon-only. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
