# TypingIndicator

Renders an optional "who" label beside three animating dots — the "someone is typing" cue.

Source: [TypingIndicator.vue](TypingIndicator.vue).

Public import: `import { TypingIndicator } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `who` | `string` | no | — | The optional name(s) of who is typing — rendered as a leading label. Rich content → the `who` slot. |
| `size` | `Size` | no | `SizeToken.Md` | The visual size of the bouncing dots. |
| `tone` | `TypingTone` | no | `TypingTone.Muted` | The color of the dots; defaults to muted. |
| `isSubtle` | `boolean` | no | — | The subtle-mode flag — tones down dot opacity at rest (between bounces). |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `who` | `who?(): unknown;` | The "who is typing" label. Falls back to the `who` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
