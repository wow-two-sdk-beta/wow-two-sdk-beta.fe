# KanbanBoard

Renders a board of columns whose cards move by drag and drop or by Alt with the arrow keys; the caller owns the data and applies each move.

Source: [KanbanBoard.vue](KanbanBoard.vue) · [KanbanColumn.vue](KanbanColumn.vue) · [KanbanCard.vue](KanbanCard.vue) · [KanbanBoardContext.ts](KanbanBoardContext.ts).

Public import: `import { KanbanBoard, KanbanColumn, KanbanCard, type KanbanMove } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- The board never reorders anything itself. It emits `move` with `{ itemKey, fromColumn, fromIndex, toColumn, toIndex }`. `toIndex` is the card's index once applied, so the caller removes it at `fromIndex` and inserts it at `toIndex`. A move that changes nothing is not emitted.
- Drag and drop uses the native API. Over a card, the drop lands before it, or after it past its middle; elsewhere in a column it lands last. A line marks the landing spot, and the dragged card dims.
- Keyboard: every card is a Tab stop described by the localized `KanbanBoard.hint`. Alt with ArrowUp / ArrowDown reorders within the column. Alt with ArrowLeft / ArrowRight moves to the neighbouring column at the same row, or last if that column is shorter; these mirror in right-to-left layouts. Focus follows the card once the caller applies the move.
- Each applied move is announced politely as `Moved <card> to <column>, position 2 of 3`. The card name is `label`, else its text.
- Columns are `section`s named by their heading; cards are list items. Column order and card counts are read from the DOM, so they always match what is on screen.
- `isLocked` keeps a card in place: not draggable, no keyboard moves and no hint.
- Attributes and `class` reach each part's root. `KanbanColumn` and `KanbanCard` throw outside a `KanbanBoard`.

## Props

### KanbanColumn

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `columnKey` | `string` | yes | — | The column's identity in `move`. |
| `title` | `string` | yes | — | The heading; names the column and its announcements. |

### KanbanCard

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `itemKey` | `string` | yes | — | The card's identity in `move`. |
| `index` | `number` | yes | — | The card's position in its column — the `v-for` index. |
| `label` | `string` | no | card text | The short name used in announcements. |
| `isLocked` | `boolean` | no | `false` | Keeps the card in place. |

## Emits

| Part | Event | Signature | Meaning |
|---|---|---|---|
| `KanbanBoard` | `move` | `move: [move: KanbanMove];` | Fires when the reader drops or keyboard-moves a card. |

## Slots

| Part | Slot | Signature | Meaning |
|---|---|---|---|
| `KanbanBoard` | `default` | `default(): unknown` | The columns. |
| `KanbanColumn` | `default` | `default(): unknown` | The cards, in order. |
| `KanbanColumn` | `header` | `header(): unknown` | Extra heading content. |
| `KanbanColumn` | `footer` | `footer(): unknown` | Content under the cards. |
| `KanbanCard` | `default` | `default(): unknown` | The card's content. |

## Exposed handle

No explicit exposed handle. `useKanbanBoardContext()` reads the drag state for custom parts.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts).
- Focused tests: [KanbanBoard.dom.test.ts](../../../../tests/unit/presentation/display/KanbanBoard.dom.test.ts) — naming, keyboard reorders and column moves, focus, announcements and locked cards; [KanbanBoard.browser.test.ts](../../../../tests/unit/presentation/display/KanbanBoard.browser.test.ts) — native drops into an empty column and below a card, with the landing indicator.
