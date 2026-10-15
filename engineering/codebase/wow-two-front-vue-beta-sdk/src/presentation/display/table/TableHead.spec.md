# TableHead

Renders the `thead` section of a `Table`, holding its header row.

Source: [TableHead.vue](TableHead.vue).

Public import: `import { TableHead } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Under a `Table` with `hasStickyHeader` it pins to the top of the scroll container on an opaque `muted` fill and
  draws its bottom rule as an inset shadow, which stays with it.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `headVariant` | `TableHeadVariant` | no | `TableHeadVariant.Uppercase` | The typography treatment for the header row. Defaults to `uppercase` (current look). |

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
