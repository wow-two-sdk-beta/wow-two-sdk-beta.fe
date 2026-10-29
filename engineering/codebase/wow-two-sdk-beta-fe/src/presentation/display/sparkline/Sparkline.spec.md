# Sparkline

Renders an inline trend chart — line, area, bar, or dot — as bare SVG with no scales or axes; evenly spaced from
`data`, or placed by time from `points`, with optional dashed threshold lines.

Source: [Sparkline.vue](Sparkline.vue).

Public import: `import { Sparkline } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- `points` places each reading by its instant inside `since`…`until` (each defaults to the first / last instant), so a
  short history sits at the right end; `data` is ignored while `points` is set.
- `thresholds` draw a dashed line per level on the series' scale, in its tone (default `muted`); pass `min` and `max`
  so a level outside the series stays on the chart.
- Strokes keep their width when CSS stretches the chart (`class="h-12 w-full"`): the viewBox stretches
  (`preserveAspectRatio="none"`) while every stroke is `non-scaling-stroke`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `data` | `ReadonlyArray<number>` | no | `[]` | The series to plot, evenly spaced in order; ignored with `points`. |
| `points` | `ReadonlyArray<SparklinePoint>` | no | `undefined` | The time-based series `{ at, value }`, oldest first. |
| `since` | `number` | no | first instant | The time window's start, epoch ms. |
| `until` | `number` | no | last instant | The time window's end, epoch ms. |
| `thresholds` | `ReadonlyArray<SparklineThreshold>` | no | `[]` | Dashed reference lines `{ value, tone? }`. |
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

```vue
<Sparkline
  class="h-12 w-full"
  :width="240"
  :height="48"
  :points="readings"
  :since="windowStart"
  :until="now"
  :min="0"
  :max="100"
  :thresholds="[{ value: 80, tone: 'warning' }, { value: 95, tone: 'danger' }]"
  aria-label="CPU: now 42%, peak 71%"
/>
```

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Sparkline.dom.test.ts](../../../../tests/unit/presentation/display/Sparkline.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
