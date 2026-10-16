# TourPopover

Renders a multi-step tour — an SVG mask cut out around each step's target, plus a step tooltip.

Source: [TourPopover.vue](TourPopover.vue).

Public import: `import { TourPopover } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | Declared by the source contract. |
| `defaultOpen` | `boolean` | no | `false` | Declared by the source contract. |
| `steps` | `ReadonlyArray<TourPopoverStep>` | yes | `() => []` | Declared by the source contract. |
| `currentStep` | `number` | no | — | Declared by the source contract. |
| `defaultCurrentStep` | `number` | no | `0` | Declared by the source contract. |
| `padding` | `number` | no | `8` | Declared by the source contract. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the tour opens or closes — a close follows Done, Skip, or Escape. |
| `update:currentStep` | `'update:currentStep': [index: number];` | Fires when the reader moves to a different step. |
| `complete` | `complete: [];` | Fires when the reader presses Done on the last step. |
| `skip` | `skip: [];` | Fires when the reader abandons the tour — the Skip button, or Escape. |

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts), [Feedback.contract.dom.test.ts](../../../../tests/unit/presentation/feedback/Feedback.contract.dom.test.ts), [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
