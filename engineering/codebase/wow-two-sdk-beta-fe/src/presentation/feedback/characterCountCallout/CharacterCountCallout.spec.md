# CharacterCountCallout

Renders the live character count for a limited field, going destructive once `value` passes `max`.

Source: [CharacterCountCallout.vue](CharacterCountCallout.vue).

Public import: `import { CharacterCountCallout } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `number` | yes | — | The current length. |
| `max` | `number` | yes | — | The maximum allowed length (also flips text to destructive when exceeded). |
| `isMaxShown` | `boolean` | no | `true` | The display mode — `current / max` (default) or just `current`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
