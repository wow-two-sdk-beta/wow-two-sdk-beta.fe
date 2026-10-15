# Table

Renders the table root and its scroll wrapper, sharing density and striping with its sections.

Source: [Table.vue](Table.vue).

Public import: `import { Table } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isStriped` | `boolean` | no | `false` | Declared by the source contract. |
| `isHoverable` | `boolean` | no | `false` | Declared by the source contract. |
| `density` | `TableDensity` | no | `TableDensity.Cozy` | Declared by the source contract. |
| `isBare` | `boolean` | no | `false` | Declared by the source contract. |
| `radius` | `TableRadius` | no | `TableRadius.Md` | The corner radius of the scroll wrapper (ignored when `isBare`). |
| `containerClassName` | `string` | no | `undefined` | Classes for the scroll wrapper (ignored when `isBare`). A fallthrough `class` lands on the inner `<table>`. |
| `hasStickyHeader` | `boolean` | no | `false` | Pins `TableHead` on an opaque fill while the body scrolls — inside the wrapper (give it a height through `containerClassName`), or the nearest scrolling ancestor when `isBare`. |

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
