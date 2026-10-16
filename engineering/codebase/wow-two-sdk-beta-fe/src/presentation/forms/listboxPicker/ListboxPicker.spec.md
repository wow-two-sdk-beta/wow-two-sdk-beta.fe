# ListboxPicker

Renders a keyboard-navigable option list with type-to-select, single or multi selection, and per-item indicators.

Source: [ListboxPicker.vue](ListboxPicker.vue).

Public import: `import { ListboxPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type                     | Required | Default     | Meaning                                                                             |
| -------------- | ------------------------ | -------- | ----------- | ----------------------------------------------------------------------------------- |
| `variant`      | `SurfaceVariant`         | no       | —           | The surface style.                                                                  |
| `tone`         | `SurfaceTone`            | no       | —           | The surface tone.                                                                   |
| `radius`       | `SurfaceRadius`          | no       | —           | The corner radius.                                                                  |
| `padding`      | `SurfacePadding`         | no       | —           | The inner padding. Default `xs` (p-1), for items breathing room.                    |
| `elevation`    | `SurfaceElevation`       | no       | —           | The elevation / shadow step.                                                        |
| `isMultiple`   | `boolean`                | no       | `false`     | The multi-select state — the value becomes an array and items toggle.               |
| `modelValue`   | `unknown`                | no       | —           | The selection, controlled. The `v-model` binding target. Array in multi mode.       |
| `defaultValue` | `unknown`                | no       | —           | The initial selection when uncontrolled. Defaults to `[]` in multi mode.            |
| `isDisabled`   | `boolean`                | no       | `undefined` | Disables all items when true.                                                       |
| `isEqual`      | `EqualityFn<unknown>`    | no       | —           | Compares item values for equality; defaults to `Object.is`.                         |
| `indicator`    | `ListboxPickerIndicator` | no       | —           | Sets the selection-indicator style; default `check` (single) or `checkbox` (multi). |
| `tabindex`     | `number`                 | no       | —           | The tab index of the list container. Defaults to `0`, or `-1` while disabled.       |

## Emits

| Event               | Signature                                | Meaning                                                                                   |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: unknown];` | Fires when the reader picks an option, or toggles one in multi mode — the `v-model` half. |
| `active-change`     | `'active-change': [id: string \| null];` | Fires when the highlighted option changes by key, pointer or the auto-highlight on mount. |

## Slots

| Slot      | Signature             | Meaning                                                              |
| --------- | --------------------- | -------------------------------------------------------------------- |
| `default` | `default(): unknown;` | The options, as `ListboxPickerItem` / `ListboxPickerGroup` children. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Editing guarantees

The active option reconciles when items unregister or become disabled. The selected enabled option wins; otherwise the first enabled option becomes active. Empty registries expose no stale active id. Disabled and read-only state inherit Field context and guard keyboard, pointer and selection callbacks.
