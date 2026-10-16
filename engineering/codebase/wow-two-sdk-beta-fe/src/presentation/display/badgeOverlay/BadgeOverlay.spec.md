# BadgeOverlay

Renders a badge, dot, or icon pinned to a corner of whatever child it wraps.

Source: [BadgeOverlay.vue](BadgeOverlay.vue).

Public import: `import { BadgeOverlay } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `position` | `CornerPosition` | no | `CornerPosition.TopRight` | The position of the badge relative to the wrapper. Default `top-right`. |
| `isHidden` | `boolean` | no | — | The hidden state — hides the badge when truthy (e.g. when count is 0). |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The element to overlay on (avatar, button, image). |
| `badge` | `badge(): unknown;` | The badge content (count, dot, icon). |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
