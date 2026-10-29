# Badge

Renders a non-interactive pill marking a status or category — optionally with a leading icon and a quieter detail
after the label.

Source: [Badge.vue](Badge.vue).

Public import: `import { Badge } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Skeleton mode keeps the pill's size, padding and radius and masks its fill and copy; the pill is `aria-hidden`.
- A status pill pairs a leading icon with the label, so the state reads by shape as well as colour; the icon is
  decorative (`aria-hidden`) and the label carries the meaning.
- `isOutlined` draws the border in the tint's colour, `borderStyle` dashes or dots any border the pill draws.
- `surface` keeps the card fill and body text — style the leading icon to carry the state's colour; `quiet` mutes the
  text on a transparent fill.
- With a leading icon or a detail the pill keeps one line: the label and the detail truncate, the icon stays.
- The detail (`data-detail`) follows the label in a normal weight with tabular figures — muted on neutral variants,
  the tint's colour on tinted ones.
- `isSpinning` turns the leading icon slowly for a state still in progress and holds it still under reduced motion.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `BadgeVariant` | no | — | The color treatment. |
| `size` | `Size` | no | — | The size step. |
| `isOutlined` | `boolean` | no | `false` | Draws the border in the tint's colour. |
| `borderStyle` | `BadgeBorderStyle` | no | `'solid'` | The border's line style: `solid` · `dashed` · `dotted`. |
| `detail` | `string` | no | `undefined` | The quieter text after the label; the `detail` slot is the rich override. |
| `isSpinning` | `boolean` | no | `false` | Turns the leading icon slowly; still under reduced motion. |
| `isSkeleton` | `boolean` | no | `undefined` | Draws the pill as its placeholder; defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The label. |
| `leading` | `leading?(): unknown` | The leading icon, sized per `size` unless the icon sets its own. |
| `detail` | `detail?(): unknown` | The rich override for `detail`. |

```vue
<Badge variant="warning" is-outlined detail="v1.4.2">
  <template #leading><TriangleAlert /></template>
  prod
</Badge>
```

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Badge.dom.test.ts](../../../../tests/unit/presentation/display/Badge.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
