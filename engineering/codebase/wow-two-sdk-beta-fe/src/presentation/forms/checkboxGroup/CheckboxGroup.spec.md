# CheckboxGroup

Renders a fieldset of `CheckboxField` children as one multi-select group, keyed by each child's `value`.

Source: [CheckboxGroup.vue](CheckboxGroup.vue).

Public import: `import { CheckboxGroup } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `legend` | `string \| number` | no | — | The group legend (label-equivalent for fieldset). Fill the `legend` slot for richer content. |
| `modelValue` | `ReadonlyArray<string>` | no | — | The selected values, controlled. The `v-model` binding target. |
| `defaultValue` | `ReadonlyArray<string>` | no | — | The initial values (uncontrolled). |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state for the whole group. |
| `orientation` | `Orientation` | no | `OrientationValue.Vertical` | The layout direction. Default `vertical`. |
| `id` | `string` | no | — | The group's id. Auto-filled from `FormControl` context when omitted. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: ReadonlyArray<string>];` | Fires when the reader ticks or unticks an item — the `v-model` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | See the declared signature. |
| `legend` | `legend?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: computed(() => root.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Reset regressions: [CompositeReset.dom.test.ts](../../../../tests/unit/presentation/forms/CompositeReset.dom.test.ts).

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
