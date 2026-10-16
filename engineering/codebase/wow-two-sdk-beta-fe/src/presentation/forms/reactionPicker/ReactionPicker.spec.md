# ReactionPicker

Renders a quick-pick row of common emoji reactions, plus a `+` that hands off to a fuller picker.

Source: [ReactionPicker.vue](ReactionPicker.vue).

Public import: `import { ReactionPicker } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `emojis` | `ReadonlyArray<string>` | no | `() => DefaultReactions` | The list of emoji shortcuts shown as quick-pick buttons. |
| `selected` | `ReadonlyArray<string>` | no | — | The currently active emoji keys (highlighted). |
| `onMore` | `() => void` | no | — | Fires when the trailing "more" button is clicked (open full picker). Kept a PROP, not an emit: its presence is what renders the button at all, and Vue strips a declared emit's listener out of `useAttrs()` — an emit could never be detected, so the button would either always or never render. |
| `isMoreHidden` | `boolean` | no | `undefined` | The hidden state for the trailing "more" button. |
| `size` | `Size` | no | `SizeValue.Md` | The compact button size. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [emoji: string];` | Fires when the reader picks one of the reactions, carrying that emoji. |

## Slots

None declared.

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
