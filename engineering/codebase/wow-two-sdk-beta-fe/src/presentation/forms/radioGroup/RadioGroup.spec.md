# RadioGroup

Renders a fieldset of `RadioField` children as one exclusive group under a shared `name`.

Source: [RadioGroup.vue](RadioGroup.vue).

Public import: `import { RadioGroup } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the outer state owner. Nested controls reconcile without issuing their own default requests. Composite drafts remount from the resolved state. A cancelled reset changes nothing.

- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Every item shares the group `name` (generated when omitted), so the browser roves the arrow keys between radios.
- Inside a `Field`, the group takes the id, label, description and invalid state; disabled and required cascade to
  every item — a required radio name asks for one pick in the group.
- While controlled, a pick only requests the change: after the owner answers, every radio is put back on the model,
  so a declined pick leaves the checked dot where it was.
- Regression: `tests/unit/presentation/forms/RadioGroup.dom.test.ts`, `FieldWrappers.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `legend` | `string \| number` | no | — | The group legend (label-equivalent for fieldset). Fill the `legend` slot for richer content. |
| `name` | `string` | no | — | The shared `name` (required for native radio behavior). Auto-generated if omitted. |
| `modelValue` | `string \| null` | no | — | The selected value, controlled. The `v-model` binding target. |
| `defaultValue` | `string \| null` | no | — | The initial value (uncontrolled). |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state for the whole group. |
| `orientation` | `Orientation` | no | `OrientationValue.Vertical` | The layout direction. Default `vertical`. |
| `id` | `string` | no | — | The group's id. Auto-filled from `FormControl` context when omitted. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string \| null];` | Fires when the reader picks a different option — the `v-model` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | See the declared signature. |
| `legend` | `legend?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: computed(() => root.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
