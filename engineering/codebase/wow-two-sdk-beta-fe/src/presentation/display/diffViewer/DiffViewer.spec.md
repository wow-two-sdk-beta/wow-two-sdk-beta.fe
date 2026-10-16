# DiffViewer

Renders a line-level diff in split or unified columns, from its own LCS pass.

Source: [DiffViewer.vue](DiffViewer.vue).

Public import: `import { DiffViewer } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Difference algorithm

The internal Hirschberg LCS pass uses linear working memory; worst-case time remains quadratic.
Common prefixes/suffixes and disjoint line sets skip the expensive pass. Both input texts and
one-based line numbers reconstruct exactly; an optimal tie may select a different unchanged occurrence.
Rendering remains eager, so very large diffs still need application-level paging or a future virtual view.
Regression: `tests/unit/presentation/display/DiffAndWaveform.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `left` | `string` | yes | `''` | Declared by the source contract. |
| `right` | `string` | yes | `''` | Declared by the source contract. |
| `view` | `DiffView` | no | `DiffView.Split` | Declared by the source contract. |
| `leftLabel` | `string \| number` | no | `'Before'` | The label for the original text. Default `"Before"`. Rich content → the `leftLabel` slot. |
| `rightLabel` | `string \| number` | no | `'After'` | The label for the modified text. Default `"After"`. Rich content → the `rightLabel` slot. |
| `hasStats` | `boolean` | no | `true` | Declared by the source contract. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `leftLabel` | `leftLabel(): unknown;` | The left-label override, when a plain string is not enough. |
| `rightLabel` | `rightLabel(): unknown;` | The right-label override, when a plain string is not enough. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
