# PasswordStrengthCallout

Renders a four-bar password strength meter from naive 0–4 scoring, or from a `score` you supply.

Source: [PasswordStrengthCallout.vue](PasswordStrengthCallout.vue).

Public import: `import { PasswordStrengthCallout } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The password to measure. |
| `score` | `0 \| 1 \| 2 \| 3 \| 4` | no | `undefined` | The override score (0–4). When set, internal scoring is bypassed. |
| `isLabelHidden` | `boolean` | no | `undefined` | The hidden state for the textual label under the bar. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
