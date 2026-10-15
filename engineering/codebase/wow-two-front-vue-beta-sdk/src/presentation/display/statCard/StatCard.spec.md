# StatCard

Renders a KPI tile — label, big value, optional trend and helper — for dashboard grids.

Source: [StatCard.vue](StatCard.vue).

Public import: `import { StatCard } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- The trend arrow follows the sign of `trend.value`; its colour follows whether that direction is good — a rise
  unless `isLowerBetter`. Zero reads neutral (muted, flat glyph).
- `trend.text` replaces the signed-percentage readout; `trend.label` follows it as a muted caption.
- The helper (prop or slot) renders under the trend; both show together.
- `href` or `onClick` makes the tile interactive: the label becomes the link or button, stretched over the whole
  tile, and describes itself with the value, trend and helper. Block content stays outside the control.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string \| number` | yes | — | The label above the value. Rich content goes through the `label` slot. |
| `value` | `string \| number` | yes | — | The primary value (large). Rich content goes through the `value` slot. |
| `trend` | `StatCardTrend` | no | — | `{ value, text?, label? }` — the signed change, its readout and caption. |
| `isLowerBetter` | `boolean` | no | `false` | A falling value is the good direction; the trend colours flip. |
| `helper` | `string \| number` | no | — | The supporting text under the trend. Rich content goes through the `helper` slot. |
| `size` | `StatCardSize` | no | `'md'` | The visual size. Default `md`. |
| `href` | `string` | no | — | Makes the tile a link. |
| `onClick` | `(event: MouseEvent) => void` | no | — | Makes the tile a button; a prop because its presence picks the element. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(): unknown;` | The rich override for the `label` prop. |
| `value` | `value?(): unknown;` | The rich override for the `value` prop. |
| `helper` | `helper?(): unknown;` | The rich override for the `helper` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [StatAndMeter.dom.test.ts](../../../../tests/unit/presentation/display/StatAndMeter.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
