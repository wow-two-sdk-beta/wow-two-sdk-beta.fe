# ChatComposerInput

Renders a chat input row — auto-resizing textarea, send button, and leading / trailing slots.

Source: [ChatComposerInput.vue](ChatComposerInput.vue).

Public import: `import { ChatComposerInput } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Native form reset requests the original seed through the state owner and restores the resulting DOM representation; a cancelled reset changes nothing.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string` | no | `undefined` | The text value, controlled. The `v-model` binding target. |
| `defaultValue` | `string` | no | — | The initial text when uncontrolled. |
| `placeholder` | `string` | no | `'Write a message…'` | The placeholder text. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state for the input + send button. |
| `leading` | `string \| number` | no | — | The content rendered on the leading edge of the toolbar (e.g. attach button). Fill the `leading` slot for richer content. |
| `trailing` | `string \| number` | no | — | The content rendered between the leading slot and the send button. Fill the `trailing` slot for richer content. |
| `sendButton` | `string \| number` | no | — | The custom send button, replacing the default. Fill the `sendButton` slot for richer content. |
| `isSendButtonHidden` | `boolean` | no | `false` | The hidden state for the send button (e.g. when consumer renders a custom CTA). |
| `submitOn` | `SubmitTrigger` | no | `'enter'` | The submit trigger for the textarea. `enter` = Enter alone (default). `mod-enter` = Cmd/Ctrl+Enter (Enter inserts a newline). |
| `maxHeight` | `number` | no | `200` | The maximum textarea pixel height before scroll kicks in. Default `200`. |
| `textareaProps` | `Record<string, unknown>` | no | — | The pass-through textarea attributes (`rows` is overridden). This is an attribute bag because the SFC prop resolver has to resolve the declared type at build time and cannot follow Vue's `TextareaHTMLAttributes` through a mapped `Omit`. Listener keys use Vue's spelling — `onKeydown`, not `onKeyDown`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the writer edits the draft message — the `v-model` half. |
| `submit` | `submit: [value: string];` | Fires when the writer sends — Enter, Mod+Enter or the button — carrying the trimmed text. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `leading` | `leading?(): unknown;` | See the declared signature. |
| `trailing` | `trailing?(): unknown;` | See the declared signature. |
| `sendButton` | `sendButton?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: textarea }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
