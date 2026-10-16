# HighlightText

Renders `text` with every occurrence of `query` wrapped in a `<MarkText>`.

Source: [HighlightText.vue](HighlightText.vue).

Public import: `import { HighlightText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Terms match case-insensitively and literally (regex symbols are plain text); the longest overlapping term wins.
- `isWholeWord` fences terms with Unicode letters and digits, so Cyrillic, accented and CJK words match whole.
- Regression: `tests/unit/presentation/display/TextAvatarsSlides.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `text` | `string` | yes | — | The source text to render. A Vue slot renders opaque vnodes that cannot be tokenised, so the text has to arrive as a prop — named `text`, matching the sibling `SnippetText`, which faced the same "string consumed by logic, not rendered as a node" case. |
| `query` | `string \| ReadonlyArray<string>` | yes | — | The substring(s) to highlight. Match is case-insensitive. |
| `isWholeWord` | `boolean` | no | — | The whole-word-only matching mode. Default `false`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
