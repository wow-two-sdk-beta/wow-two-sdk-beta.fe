# Toolbar

Renders a bordered strip of actions that arrow keys walk through as a single tab stop.

Source: [Toolbar.vue](Toolbar.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ HTMLAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `orientation` | `Orientation` | no | `OrientationValue.Horizontal` | The layout axis — drives both the arrow-key navigation and the flex direction. Default `horizontal`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The toolbar items — buttons, links, and separators sharing one roving tab stop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
