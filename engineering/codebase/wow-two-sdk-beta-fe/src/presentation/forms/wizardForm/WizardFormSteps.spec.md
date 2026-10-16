# WizardFormSteps

Renders the clickable step strip, where already-visited steps stay re-selectable while `canGoBack`.

Source: [WizardFormSteps.vue](WizardFormSteps.vue).

Public import: `import { WizardFormSteps } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Each tab carries a wizard-scoped id; the active tab's `aria-controls` names the rendered panel, which is labelled by it.
- One tab stop: the active step's tab. ArrowRight/ArrowDown and ArrowLeft/ArrowUp move focus and wrap (mirrored in RTL);
  Home and End jump to the ends. Activation is manual: Enter, Space or a click re-opens a visited step while `canGoBack`.
- Regression: `tests/unit/presentation/forms/WizardForm.dom.test.ts`.

## Props

No declared props.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
