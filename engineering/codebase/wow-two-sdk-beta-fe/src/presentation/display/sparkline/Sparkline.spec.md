# Sparkline

Renders an inline trend chart — line, area, bar, or dot — as bare SVG with no scales or axes.

Source: [Sparkline.vue](Sparkline.vue).

Public import: `import { Sparkline } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `data` | `ReadonlyArray<number>` | yes | — | The series to plot, in order. |
| `variant` | `SparklineVariant` | no | `'line'` | The render style. Default `line`. |
| `width` | `number` | no | `120` | The px width of the viewBox. Default `120`. |
| `height` | `number` | no | `32` | The px height of the viewBox. Default `32`. |
| `tone` | `SparklineTone` | no | `'brand'` | The color tone. Default `brand`. |
| `min` | `number` | no | `undefined` | The lower bound of the value scale. Defaults to the series minimum. |
| `max` | `number` | no | `undefined` | The upper bound of the value scale. Defaults to the series maximum. |
| `hasLast` | `boolean` | no | `undefined` | The emphasized dot on the final point. |
| `ariaLabel` | `string` | no | `'Trend'` | The accessible label summarizing the trend. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps the chart's width and height as one `aria-hidden` placeholder with no series. Defaults to the nearest `DataRegion` first load. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
