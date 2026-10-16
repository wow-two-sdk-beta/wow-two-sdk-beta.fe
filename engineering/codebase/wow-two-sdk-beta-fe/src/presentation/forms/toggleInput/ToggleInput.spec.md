# ToggleInput

Renders a two-state action button that shows and announces whether it is currently pressed.

Source: [ToggleInput.vue](ToggleInput.vue).

Public import: `import { ToggleInput } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ ToggleInputAttributes, /* @vue-ignore */ Omit<ToggleInputVariants, 'variant' | 'tone'>`. These members remain part of the component surface.

| Prop           | Type                 | Required | Default                          | Meaning                                                                                         |
| -------------- | -------------------- | -------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `variant`      | `ToggleInputVariant` | no       | `ToggleInputVariantValue.Ghost`  | The press-state surface style.                                                                  |
| `tone`         | `ColorTone`          | no       | `ColorToneValue.Primary`         | The semantic tone palette.                                                                      |
| `modelValue`   | `boolean`            | no       | `undefined`                      | The controlled pressed state.                                                                   |
| `defaultValue` | `boolean`            | no       | `undefined`                      | The uncontrolled initial state. Ignored if `modelValue` is set.                                 |
| `value`        | `string`             | no       | —                                | The identity inside a `ToggleGroup`, keying its selection. Also the native `value` attr.        |
| `title`        | `StateAware<string>` | no       | —                                | The tooltip text — a string, or a fn receiving `{ pressed }` for a state-aware label.           |
| `color`        | `ColorProp`          | no       | —                                | The per-instance color override — applies to the active `tone`'s theme tokens. See `ColorProp`. |
| `tooltip`      | `VNodeChild`         | no       | `undefined`                      | The rich tooltip for icon-only toggles. A string degrades to native `title`; a node is ignored. |
| `as`           | `ToggleInputElement` | no       | `ToggleInputElementValue.Button` | The render element. `div` (role=button) lets interactive children nest. Default `button`.       |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps the segment's box, draws its label as a bar, hides the pressed state, sets `inert`. Defaults to the nearest `DataRegion` first load. |

## Emits

| Event               | Signature                                  | Meaning                                                                           |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [pressed: boolean];` | Fires when the reader turns the toggle on or off, carrying the new pressed state. |

## Slots

| Slot      | Signature                                        | Meaning                                                                                |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `default` | `default(props: { pressed: boolean }): unknown;` | The button's label — receives `{ pressed }` so the content can track the toggle state. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Actions.a11y.dom.test.ts](../../../../tests/unit/presentation/actions/Actions.a11y.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

Disabled, loading and inherited read-only state block keyboard and model changes even when rendering a div or slotted child. Inactive custom roots leave the tab sequence. Native form reset works for div/as-child roots through a separate reset anchor.
