# AudioWaveformPreview

Renders an SVG bar waveform from per-bin `peaks` amplitudes, seekable by click and arrow keys.

Source: [AudioWaveformPreview.vue](AudioWaveformPreview.vue).

Public import: `import { AudioWaveformPreview } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Geometry and interaction

Invalid non-positive dimensions/bar width fall back to defaults; invalid/negative gaps use the default.
Amplitudes and playback position normalize for display. Bars never outnumber source samples or horizontal
pixels; sparse samples spread across the width. Empty data renders one flat bar. This bounds derived work
by the provided data rather than allocating from an unchecked dimension.
Explicit `isInteractive=false`, canceled events and composing keyboard input suppress seeking.
A zero-sized SVG cannot produce a seek fraction. Static images omit slider-only ARIA values.
Regression: `tests/unit/presentation/display/DiffAndWaveform.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `peaks` | `ReadonlyArray<number>` | yes | `() => []` | The per-bin amplitudes in 0..1. |
| `progress` | `number` | no | `0` | The played fraction in 0..1. Default `0`. |
| `width` | `number` | no | `320` | The SVG width in px. Default `320`. |
| `height` | `number` | no | `48` | The SVG height in px. Default `48`. |
| `barWidth` | `number` | no | `2` | The width of a single bar in px. Default `2`. |
| `gap` | `number` | no | `1` | The gap between bars in px. Default `1`. |
| `tone` | `AudioWaveformPreviewTone` | no | `'brand'` | The color tone. Default `brand`. |
| `onSeek` | `(progress: number) => void` | no | `undefined` | Fires with the seeked progress in 0..1. Kept a prop rather than an emit because its *presence* is load-bearing — it decides `role="slider"` vs `role="img"` when `isInteractive` is omitted, and Vue strips declared emit listeners out of `useAttrs()`, leaving no way to observe them. |
| `isInteractive` | `boolean` | no | `undefined` | The interactive state. Defaults to whether `onSeek` was supplied. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
