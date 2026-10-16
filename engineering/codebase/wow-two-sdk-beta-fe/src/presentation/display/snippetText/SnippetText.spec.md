# SnippetText

Renders code text with a copy button, inline for one-liners or block for multi-line snippets — a block keeps its line breaks and indentation, scrolling sideways instead of wrapping.

Source: [SnippetText.vue](SnippetText.vue).

Public import: `import { SnippetText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- `block` renders the text with `white-space: pre`, so a shell command's `\` continuations and a JSON document's indentation read as written; `inline` collapses whitespace like any text run.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `text` | `string` | yes | — | The code text to display + copy. |
| `variant` | `SnippetTextVariant` | no | `SnippetTextVariant.Inline` | The visual variant — `inline` (single line) or `block` (multi-line). Default `inline`. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Behavior test: [SnippetTextBlock.dom.test.ts](../../../../tests/unit/presentation/display/SnippetTextBlock.dom.test.ts).
- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
