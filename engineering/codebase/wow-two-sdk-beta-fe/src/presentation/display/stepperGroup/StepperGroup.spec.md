# StepperGroup

Renders the stepper root, owning the active step value for the strip and panels below it.

Source: [StepperGroup.vue](StepperGroup.vue).

Public import: `import { StepperGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Step values may change without remounting: token-owned registration preserves each step’s position and cleans up its own entry.
- Step values must be unique; they identify both selected state and corresponding panel IDs. Numeric zero descriptions render.

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop           | Type          | Required | Default                       | Meaning                                                          |
| -------------- | ------------- | -------- | ----------------------------- | ---------------------------------------------------------------- |
| `modelValue`   | `string`      | no       | `undefined`                   | The active step value, controlled. The `v-model` binding target. |
| `defaultValue` | `string`      | no       | `undefined`                   | The initial active step value when uncontrolled.                 |
| `orientation`  | `Orientation` | no       | `OrientationValue.Horizontal` | The layout axis. Default `horizontal`.                           |

## Emits

| Event               | Signature                               | Meaning                                                               |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader moves to a different step — the `v-model` half. |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
