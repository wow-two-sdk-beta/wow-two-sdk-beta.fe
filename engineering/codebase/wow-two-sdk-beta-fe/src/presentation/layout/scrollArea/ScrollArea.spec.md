# ScrollArea

Renders a native scrollable container with stable visuals.

Source: [ScrollArea.vue](ScrollArea.vue).

Public import: `import { ScrollArea } from '@wow-two-beta/fe/presentation/layout';`.

## Contract

- `hasAutoHideScrollbar` opts the area in to the `scrollbar-auto-hide` styles and marks it with `data-scrolling` while it scrolls; by default the themed scrollbar stays visible.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `axis` | `ScrollAxis` | no | `ScrollAxis.Vertical` | The scroll axis. Default `vertical`. |
| `hasAutoHideScrollbar` | `boolean` | no | `false` | Fades the scrollbar thumb while the area is idle; it returns on hover and while the area scrolls. The track keeps its space. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The scrollable content. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
