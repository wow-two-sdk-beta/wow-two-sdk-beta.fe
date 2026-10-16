# PointControl

Normalized two-axis point selection for texture anchors and spatial form values.
Public import: `import { PointControl } from '@wow-two-beta/ui-vue/presentation/forms'`.
Source: [PointControl.vue](PointControl.vue).

Consumers that do not import the global SDK stylesheet import
`@wow-two-beta/ui-vue/presentation/forms/point-control/styles.css` beside their own Tailwind and semantic tokens.

## Value

- `modelValue`/`update:modelValue` owns `{ x, y }`, with each axis clamped to `0..1`.
- `defaultValue` seeds uncontrolled state; the default is `{ x: 0.5, y: 0.5 }`.

## Interaction

- pointer drag maps the surface bounds to normalized coordinates and uses pointer capture.
- arrow keys move by `step`; Shift moves by ten steps; Home and End select opposite corners.
- `interaction-start` and `interaction-end` delimit pointer or keyboard gesture history.
- the slider exposes both axis percentages through `aria-valuetext`; `isDisabled` (deprecated alias `disabled`, removed next release) leaves the tab order and ignores pointer and keys.
