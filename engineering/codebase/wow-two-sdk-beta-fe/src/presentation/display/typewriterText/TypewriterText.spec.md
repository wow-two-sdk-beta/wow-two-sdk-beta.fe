# TypewriterText

Renders text typed character by character, cycling when given an array of strings.

Source: [TypewriterText.vue](TypewriterText.vue).

Public import: `import { TypewriterText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- The built-in pause button is available for animated phrases and suspends timer-driven changes until resumed.
- Accessible text contains the stable complete phrase list; per-character visual changes and the cursor are hidden from assistive technology.
- A nonlooping sequence retains its completed final phrase.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `text` | `string \| ReadonlyArray<string>` | yes | — | The phrase, or the phrases to cycle through. |
| `typeSpeed` | `number` | no | `60` | The ms between typed characters. Default `60`. |
| `deleteSpeed` | `number` | no | `40` | The ms between deleted characters. Default `40`. |
| `pauseBetween` | `number` | no | `1500` | The ms held on a completed phrase before deleting. Default `1500`. |
| `canLoop` | `boolean` | no | `undefined` | The cycle-forever flag. Defaults to `true` when more than one phrase was given. |
| `pauseLabel` | `string` | no | `'Pause animation'` | The localized pause action label. |
| `resumeLabel` | `string` | no | `'Resume animation'` | The localized resume action label. |
| `hasCursor` | `boolean` | no | `true` | The blinking caret. Default `true`. |
| `cursorChar` | `string` | no | `'│'` | The caret glyph. Default `│`. |
| `as` | `ElementTag` | no | `'span'` | The rendered tag. Default `span`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [MotionControls.dom.test.ts](../../../../tests/unit/presentation/display/MotionControls.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
