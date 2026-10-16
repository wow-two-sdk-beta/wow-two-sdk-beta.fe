# MentionInput

Renders a multi-line text field that suggests people or items after a trigger character (`@`) and inserts the pick in place.

Source: [MentionInput.vue](MentionInput.vue).

Public import: `import { MentionInput, type MentionOption } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- The model is the plain text. `modelValue` / `update:modelValue` and `defaultValue` follow the shared controlled-state helper. The `mention` event reports each inserted option; mentions are not tracked after insertion.
- A mention starts at `trigger` when it opens the text or follows whitespace, and runs to the caret while no whitespace intervenes. `search` fires with each new query; update `options` from it for server-side lookup, and pass `filter` returning `true` to skip local filtering.
- Suggestions open under the trigger, anchored through a caret mirror and portalled on the dropdown tier; at most `maxSuggestions` show. They close on whitespace, on blur, or when nothing matches.
- Keyboard: ArrowDown / ArrowUp cycle the highlight (`aria-activedescendant` on the textarea, which keeps focus). Enter or Tab inserts. Escape dismisses the suggestions until another mention starts. A click inserts without stealing focus.
- Inserting replaces the trigger and query with `format(option)` (default `@Label`) plus a space, and parks the caret after it. A polite region announces the suggestion count.
- Disabled, read-only and invalid states fall back to the surrounding `Field`, as do the id and description. A locked field never suggests. Attributes and `class` reach the textarea; `name` submits the text natively.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string` | no | — | The text, controlled — the `v-model` target. |
| `defaultValue` | `string` | no | `''` | The initial text when uncontrolled. |
| `options` | `ReadonlyArray<MentionOption>` | yes | — | The suggestions: `{ value, label, description? }`. |
| `trigger` | `string` | no | `'@'` | The character that starts a mention. |
| `filter` | `(option, query) => boolean` | no | label match | Decides which options match. |
| `format` | `(option) => string` | no | `@Label` | Builds the inserted text. |
| `maxSuggestions` | `number` | no | `8` | The most suggestions listed. |
| `rows` | `number` | no | `3` | The visible text rows. |
| `placeholder` | `string` | no | — | The empty-state text. |
| `id` | `string` | no | Field id | The textarea id. |
| `isDisabled` | `boolean` | no | Field state | Blocks interaction. |
| `isReadOnly` | `boolean` | no | Field state | Keeps the text but blocks changes. |
| `isInvalid` | `boolean` | no | Field state | Styles the field as invalid. |
| `name` | `string` | no | — | The field name. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [text: string];` | Fires when the text changes. |
| `search` | `search: [query: string];` | Fires when the typed mention query changes. |
| `mention` | `mention: [option: MentionOption];` | Fires when the reader inserts a suggestion. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `option` | `option(props: { option: MentionOption; isHighlighted: boolean }): unknown` | Replaces a suggestion's content. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts).
- Focused tests: [MentionInput.dom.test.ts](../../../../tests/unit/presentation/forms/MentionInput.dom.test.ts) — trigger rules, highlight, insertion, caret, queries, Escape, clicks, formats and read-only; [MentionInput.browser.test.ts](../../../../tests/unit/presentation/forms/MentionInput.browser.test.ts) — caret anchoring and keyboard insertion in real browsers.
