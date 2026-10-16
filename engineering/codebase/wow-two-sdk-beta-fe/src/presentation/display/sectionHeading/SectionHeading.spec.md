# SectionHeading

Renders a section header: a `Heading` title, an optional `Text` description, and an actions slot.

Source: [SectionHeading.vue](SectionHeading.vue).

Public import: `import { SectionHeading } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | `string \| number` | no | — | The heading copy. the scalar form is the prop and the same-named slot is the rich override, so it is optional — a consumer filling `#title` need not also pass the prop. |
| `description` | `string \| number` | no | — | The optional description below the title. |
| `level` | `SectionHeadingLevel` | no | `2` | The heading element / size. Default level 2, size lg. |
| `size` | `SectionHeadingSize` | no | `SectionHeadingSize.Lg` | Declared by the source contract. |
| `isBordered` | `boolean` | no | `true` | The bottom border's visibility. Default true. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps border and layout; the title, description and actions draw their skeletons. Defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `title` | `title?(): unknown;` | The rich override for the `title` prop. |
| `description` | `description?(): unknown;` | The rich override for the `description` prop. |
| `actions` | `actions?(): unknown;` | The right-aligned actions slot — typically Button(s). Cross-domain by design, passed as content. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
