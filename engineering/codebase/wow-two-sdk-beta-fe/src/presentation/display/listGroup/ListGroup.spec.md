# ListGroup

Renders a bulleted, numbered, or check list container.

Source: [ListGroup.vue](ListGroup.vue).

Public import: `import { ListGroup } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isOrdered` | `boolean` | no | `undefined` | The ordered mode — renders `<ol>` instead of `<ul>`. |
| `marker` | `ListGroupMarker` | no | — | The item marker style. |
| `spacing` | `ListGroupSpacing` | no | — | The vertical spacing between items. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps every row; each `ListGroupItem` masks its own content. An explicit `true` sets `aria-busy`. Defaults to the nearest `DataRegion` first load. |

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
