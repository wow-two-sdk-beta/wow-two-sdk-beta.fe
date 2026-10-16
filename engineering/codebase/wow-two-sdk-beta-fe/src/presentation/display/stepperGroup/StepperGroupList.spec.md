# StepperGroupList

Renders the step strip, its arrow-key navigation coming from the surrounding `RovingFocusGroup`.

Source: [StepperGroupList.vue](StepperGroupList.vue).

Public import: `import { StepperGroupList } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useStepperContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el: HTMLElement | null }` targets the inner Card or RovingFocusGroup DOM root, not its component instance. Read after mount; the handle is null before mount and after the child unmounts. It is suitable for native focus, measurement and scrolling; it does not expose child implementation methods.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
