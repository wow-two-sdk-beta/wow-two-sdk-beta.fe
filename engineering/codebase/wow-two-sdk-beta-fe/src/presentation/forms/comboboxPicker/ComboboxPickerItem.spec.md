# ComboboxPickerItem

Renders one selectable option row with a tick when selected, registering itself for keyboard nav.

Source: [ComboboxPickerItem.vue](ComboboxPickerItem.vue).

Public import: `import { ComboboxPickerItem } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Mount within the owner supplying `useComboboxContext`; a compound part is not an independent root.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value this option selects. |
| `isDisabled` | `boolean` | no | `false` | The disabled state for this option. Default `false`. |
| `label` | `string \| number` | no | — | The plain-text label registered for the input's fill-on-select. Defaults to `value`. a slot cannot be captured into the registry, so the scalar lives here and the default slot renders the row. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
