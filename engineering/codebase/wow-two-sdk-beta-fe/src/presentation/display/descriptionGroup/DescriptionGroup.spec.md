# DescriptionGroup

Renders label-value pairs as a semantic `<dl>` for settings and property lists.

Source: [DescriptionGroup.vue](DescriptionGroup.vue).

Public import: `import { DescriptionGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `items` | `ReadonlyArray<DescriptionGroupItem>` | yes | — | Declared by the source contract. |
| `layout` | `DescriptionGroupLayout` | no | `DescriptionGroupLayout.Inline` | The layout direction. `inline` renders label/value on the same line; `stacked` puts label above. |
| `density` | `DescriptionGroupDensity` | no | `DescriptionGroupDensity.Md` | The density between rows. Default `md`. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps every row and draws terms and plain values as bars; a value slot holding components lets them draw their own shapes. Defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(props: { item: DescriptionGroupItem; index: number }): unknown;` | The rich override for a row's label cell. |
| `value` | `value?(props: { item: DescriptionGroupItem; index: number }): unknown;` | The rich override for a row's value cell. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
