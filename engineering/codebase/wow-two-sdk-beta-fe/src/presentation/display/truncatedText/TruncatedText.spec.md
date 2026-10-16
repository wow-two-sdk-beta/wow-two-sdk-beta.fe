# TruncatedText

Renders copy clamped to a number of lines, with a toggle that appears only when the copy overflows.

Source: [TruncatedText.vue](TruncatedText.vue).

Public import: `import { TruncatedText } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- The expanded state uses the shared controlled-state helper: `open` / `update:open`, seeded by `defaultOpen`.
- The clamp is the `line-clamp-(--truncated-lines)` utility with the line count in `--truncated-lines`; the consumer's Tailwind scan must include the package output.
- Overflow is measured while collapsed — on mount, on resize and on content mutation. The toggle shows while the collapsed copy overflows and stays while expanded.
- Server rendering shows the clamped copy without a toggle; the client adds it after measuring.
- Attributes and `class` reach the root; the exposed handle is the content element.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `lines` | `number` | no | `3` | The lines shown while collapsed; rounded, at least 1. |
| `open` | `boolean` | no | `undefined` | The expanded state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial expanded state when uncontrolled. |
| `moreLabel` | `string` | no | `"Show more"` | The collapsed toggle text; localized `TruncatedText.moreLabel`. |
| `lessLabel` | `string` | no | `"Show less"` | The expanded toggle text; localized `TruncatedText.lessLabel`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the reader expands or collapses the copy — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The copy. |
| `toggle` | `toggle?(props: { open: boolean; toggle: () => void; contentId: string }): unknown` | Replaces the built-in toggle button. |

## Exposed handle

`{ el }` — the content element.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
- Focused tests: [TextAndTimers.dom.test.ts](../../../../tests/unit/presentation/display/TextAndTimers.dom.test.ts).

## Interaction guarantees

The built-in toggle is a `<button>` with `aria-expanded` and `aria-controls` pointing at the content.
