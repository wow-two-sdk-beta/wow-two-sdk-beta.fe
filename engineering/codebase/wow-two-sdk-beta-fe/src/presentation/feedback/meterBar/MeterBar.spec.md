# MeterBar

Renders a horizontal gauge whose fill color crosses threshold zones — green / amber / red.

Source: [MeterBar.vue](MeterBar.vue).

Public import: `import { MeterBar } from '@wow-two-beta/fe/presentation/feedback';`.

## Contract

- Without `isLabelVisible` the root is the `role="meter"` bar, named by `label`. With it, the root is a column: a
  row with the label (naming the meter) and the readout — `valueLabel`, else the rounded locale percentage — over
  the bar; `class` and attributes land on that column.
- `isLoading` drops the fill, pulses the track under `motion-safe`, marks the meter `aria-busy` with a loading value
  text, and draws the label and readout as bars that keep their line; an absent `isLoading` follows the nearest
  `DataRegion` first load.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `number` | yes | — | The current value 0–`max`. |
| `max` | `number` | no | `100` | Declared by the source contract. |
| `thresholds` | `[number, number]` | no | — | The threshold values that change the fill tone. Pass `[good, warn]` — `value <= good` → success, `<= warn` → warning, otherwise destructive. Defaults: `[max * 0.7, max * 0.9]`. |
| `size` | `Size` | no | `SizeToken.Md` | The bar thickness. |
| `label` | `string` | no | — | The meter's accessible name; drawn above the bar with `isLabelVisible`. |
| `isLabelVisible` | `boolean` | no | `false` | Draws the label and readout above the bar. |
| `valueLabel` | `string` | no | rounded percentage | The readout beside a visible label. |
| `isLoading` | `boolean` | no | `undefined` | The value is still loading: no fill, pulsing track, label and readout bars. Defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [StatAndMeter.dom.test.ts](../../../../tests/unit/presentation/display/StatAndMeter.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
