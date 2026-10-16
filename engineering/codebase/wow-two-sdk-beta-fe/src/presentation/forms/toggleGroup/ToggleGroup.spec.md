# ToggleGroup

Renders a row of toggle buttons sharing one selection — at most one active, or any number.

Source: [ToggleGroup.vue](ToggleGroup.vue).

Public import: `import { ToggleGroup } from '@wow-two-beta/fe/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ Omit<
  HTMLAttributes,
  'defaultValue' | 'onChange'
>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `type` | `ToggleMode` | no | `undefined` | The selection cardinality — `Single` for at-most-one, `Multi` for any number. |
| `modelValue` | `T \| null \| ReadonlyArray<string>` | no | `undefined` | The controlled value — `T \| null` in single mode, a string array in multi mode. |
| `defaultValue` | `T \| null \| ReadonlyArray<string>` | no | `undefined` | The uncontrolled initial value. Ignored once `modelValue` is set. |
| `orientation` | `Orientation` | no | `OrientationValue.Horizontal` | The layout axis of the button row/column. |
| `isAttached` | `boolean` | no | `true` | The attached state — collapses inner radii into a connected row/column. |
| `variant` | `ToggleGroupVariant` | no | `ToggleGroupVariantValue.Default` | The visual style. - `default` — standard button row/column (borders + attached radii). - `segmented` — iOS-style connected pill row on a muted track; the active segment lifts to a `background` surface. Forces `isAttached`. - `pill` — individually-separated rounded pills (each item its own detached chip). Forces detached (never attaches). |
| `itemRole` | `ToggleItemRole` | no | `ToggleItemRoleValue.Group` | The ARIA role wiring. - `group` (default) — `role="group"` of independent toggle buttons. - `tab` — opt into tablist semantics: root renders `role="tablist"` and each item `role="tab"` + `aria-selected`. Pairs naturally with single-select. |
| `equalWidth` | `boolean` | no | `false` | The equal-width state — lays items out as equal-width tiles (each `flex-1 basis-0`) for an icon category strip where every cell should share the row width. Additive; the default keeps intrinsic item widths. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps every segment's box and draws its label as a bar; a segmented track lifts every segment. Defaults to the nearest `DataRegion` first load. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: T \| null \| ReadonlyArray<string>];` | Fires when the reader changes the selection — `T \| null` in single mode, the array in multi mode. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The `ToggleInput` children whose selection this group coordinates. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Reset regressions: [CompositeReset.dom.test.ts](../../../../tests/unit/presentation/forms/CompositeReset.dom.test.ts).

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
