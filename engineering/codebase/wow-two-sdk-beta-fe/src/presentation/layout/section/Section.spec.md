# Section

Renders a full-bleed `<section>` band with an inner centered `ContainerLayout`.

Source: [Section.vue](Section.vue).

Public import: `import { Section } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `tone` | `SurfaceTone` | no | — | The tinted background tone for the band. Applies the shadow-less `subtle` surface treatment (low-alpha tinted fill + `border-border`). Omit for a transparent band (no fill, no border). |
| `containerSize` | `ContainerLayoutProps['size']` | no | — | The max-width of the inner centered `ContainerLayout`. Passthrough to `ContainerLayout.size`. Default `lg`. |
| `py` | `SectionPaddingY` | no | — | The vertical padding (the band's top/bottom rhythm). Default `md`. |
| `isFullBleed` | `boolean` | no | `false` | The full-bleed mode — renders a `<section>` with no inner `ContainerLayout` (edge-to-edge content). |
| `bleed` | `boolean` | no | —       | Deprecated — use `isFullBleed`; removed next release.                                               |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The band content — wrapped in a `ContainerLayout` unless `bleed` is set. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
