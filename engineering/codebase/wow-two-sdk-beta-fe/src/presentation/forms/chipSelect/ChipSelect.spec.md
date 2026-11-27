# ChipSelect

Renders a choice as one field — the chosen options as icon chips inside it, with a `+N` chip for the ones that do not fit — and a panel that lists every option with its icon, label, count and a check.

Source: [ChipSelect.vue](ChipSelect.vue) · [ChipSelectChip.vue](ChipSelectChip.vue) (internal chip) · [ChipSelectHint.vue](ChipSelectHint.vue) (internal tooltip).

Public import: `import { ChipSelect } from '@wow-two-beta/fe/presentation/forms';`.

Built on the SDK `Popover` (a modal one, so focus stays in the panel) and `ListboxPicker` (the listbox, its keyboard and its ARIA), with the `Tooltip` for the hints. `MultiSelectPicker` does not fit: its chips are removable text with a fixed budget, it has no icons, counts or hints, and it has no single mode.

## Contract

- `options` is `[{ value, label, count?, icon?, hint? }]` (`ChipSelectOption`); order is display order and values are unique. The control filters nothing: the consumer owns the rows and counts, the control only renders `count`.
- The value is one `v-model`: a `string` or `null` for a single select, a `string[]` when `isMultiple`. It follows the shared controlled-state rule: a supplied `modelValue` is read from props and a pick reports intent through `update:modelValue`; without one the control owns the choice, seeded once from `defaultValue`. A pick writes the same value a `ToggleGroup` of pills does — a multiple select appends in pick order, a single pick writes the string, and the "Any" row writes `null`.
- The field is a `button` with `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded` and `aria-controls` the open panel's listbox. Its accessible name is the `label` (else the `placeholder`) and a summary of the choice: `Format: Any` with nothing chosen, the labels (`Format: Conference and Expo`) up to three, then `selectedLabel` (`Format: 4 selected`). `class` and attributes reach the button; the width classes it carries (`w-72`) give way to the caller's.
- Width: `18rem`, never narrower than `12rem` (`min-w-[min(12rem,100%)]`) and never wider than its container (`max-w-full`) — below `12rem` of container the container wins. The field is one fixed-height line (`h-9`, fully rounded).
- With nothing chosen the field shows the `placeholder` (else the `label`) in the muted text token. With choices it shows one chip per chosen option, in the options' order. An icon-only chip is square (`1.5rem`) and has its label as the accessible name. A text chip grows with its label up to the truncation limit. A chip without a hint keeps its native title. A chosen option whose `count` is exactly `0` has a muted chip (`data-empty`, `opacity-60`).
- Overflow: the chips that do not fit the field's width are replaced by one `+N` chip, N the number hidden, named by `moreLabel` (`3 more selected`, `role="img"`). The fit is measured, never a fixed count: an off-screen, `aria-hidden` row lays out every chosen chip and a `+N` chip at their natural widths, and a `ResizeObserver` on the chip strip re-measures when the field resizes; a changed choice re-measures after render. The `+N` chip's room is reserved before chips are counted, so nothing is clipped; with no room for even one chip only `+N` shows. Where nothing can be measured (server render, a test DOM with no layout) every chip shows.
- The panel opens below the field (`bottom-start`, flipping and shifting to stay on screen), at least as wide as the field and no wider than the viewport minus `2.5rem`. It is a modal popover: focus moves into the listbox on open, Tab and Shift+Tab stay inside it, the page behind is inert, a click outside or Escape closes it, and closing returns focus to the field.
- The listbox (`role="listbox"`, named by the `label`, `aria-multiselectable` when `isMultiple`) lists every option in order. A row (`role="option"`, `aria-selected`) shows the `icon`, the `label`, the `count` (muted, tabular figures, in the reader's locale) and a check mark at the end when chosen; the check's place is kept free on every row so counts stay aligned. A chosen row takes the selected surface.
- An option whose `count` is exactly `0` and which is not chosen is muted: `data-empty` on the row, muted text and icon at `opacity-60`. It stays selectable, and a chosen row with count `0` keeps its chosen style (no `data-empty`). A missing `count` is never empty.
- A multiple select toggles an option per click and keeps the panel open. A single select adds an "Any" row first (`anyLabel`, `aria-selected` while nothing is chosen) and a pick closes the panel; picking the chosen row again closes it and keeps the choice, and the "Any" row clears it.
- Keyboard: ArrowDown or ArrowUp on the field opens the panel (Enter and Space open it as a button does). In the panel Arrow keys move the active option (`aria-activedescendant`, DOM focus stays on the listbox), Home and End jump to the first and last, Space and Enter toggle the active option (and close a single panel), and Escape closes and returns focus to the field.
- An option's `hint` opens a tooltip above its selected chip, with viewport collision handling. When `showRowHints` is true, the same tooltip can open beside its listbox row. The card includes the icon or image, label, description and localized count when supplied. Opening the dropdown dismisses any visible chip hint.
- The card opens after `hintOpenDelay` of hover (unset, the `Tooltip`'s own 700 ms) and after the same wait on the row the keyboard moved to. A row never takes DOM focus, so the keyboard-active row gets a virtual `focus` and the row it leaves a virtual `blur` — the events the tooltip already listens for on a button — and only while the last input was the keyboard; a pointer over another row ends it. It closes when the pointer and the keyboard both leave, and on Escape. `hintFadeDuration` (unset, no fade) fades it in and out over that many ms; `prefers-reduced-motion: reduce` turns the fade off.
- The default texts (`anyLabel`, `selectedLabel`, `moreLabel`, `hintCountLabel`) follow the nearest `LocaleProvider` under `ChipSelect.*` keys; explicit caller text wins.
- `isDisabled` disables the field button: it neither focuses nor opens.
- Under a coarse pointer the pill field is at least 44px high (the shared input floor) and the panel rows at least 44px; a fine pointer keeps the 40px pill (`## Touch`).

## Touch

Under a coarse pointer (a finger) at one viewport size, against a fine one (a mouse):

| Element | Touch change | Kind |
|---|---|---|
| field box | 40px → at least 44px tall, chips and chevron centred | visible height |
| field text | 14px → 16px (`pointer-coarse:text-base`), so iOS never zooms the page into the field | text size |
| panel rows | at least 44px tall (the `ListboxPicker` row floor) | visible height |

## Props

| Prop               | Type                                    | Required | Default                     | Meaning                                                                                  |
| ------------------ | --------------------------------------- | -------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| `options`          | `ReadonlyArray<ChipSelectOption>`       | yes      | —                           | The choices, in display order.                                                           |
| `modelValue`       | `string \| ReadonlyArray<string> \| null` | no     | `undefined` (uncontrolled)  | The choice — the `v-model` target. A `string` or `null` single, a `string[]` when `isMultiple`. |
| `defaultValue`     | `string \| ReadonlyArray<string> \| null` | no     | none                        | The initial choice when uncontrolled.                                                    |
| `isMultiple`       | `boolean`                               | no       | `false`                     | Whether the select takes several values.                                                 |
| `placeholder`      | `string`                                | no       | the `label`                 | The field's text while nothing is chosen.                                                |
| `label`            | `string`                                | no       | the `placeholder`           | The control's name, the prefix of its accessible name.                                   |
| `isDisabled`       | `boolean`                               | no       | `false`                     | Whether the field neither opens nor changes.                                             |
| `anyLabel`         | `string`                                | no       | `'Any'`                     | The single select's clearing row, and the name with nothing chosen; `ChipSelect.anyLabel`. |
| `selectedLabel`    | `string`                                | no       | `'{count} selected'`        | The accessible name with more than three chosen; `ChipSelect.selectedLabel`.             |
| `moreLabel`        | `string`                                | no       | `'{count} more selected'`   | The `+N` chip's accessible name; `ChipSelect.moreLabel`.                                 |
| `hintCountLabel`   | `string`                                | no       | `'{count}'`                 | A hint card's count line; `ChipSelect.hintCountLabel`.                                   |
| `showRowHints`     | `boolean`                               | no       | `true`                      | Whether dropdown rows show option hints.                                                |
| `hintOpenDelay`    | `number`                                | no       | the `Tooltip`'s, `700`      | How long a chip or row waits before its hint card opens, in ms.                          |
| `hintFadeDuration` | `number`                                | no       | —                           | How long a hint card takes to fade in and out, in ms; none by default.                   |

Types: `ChipSelectOption` (`{ value, label, count?, icon?, hint? }`), `ChipSelectOptionHint` (`{ description, imageSrc?, imageAlt? }`), `ChipSelectProps`.

## Emits

| Event               | Signature                                                              | Meaning                                                                                                |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `update:modelValue` | `'update:modelValue': [value: string \| ReadonlyArray<string> \| null]` | Fires when the reader changes the choice — a value or `null` for a single select, the set when `isMultiple`. |

## Slots

The optional `hint` slot receives `{ option, surface }`. The surface is `'chip'` or `'row'`. Supply content for the options and surfaces that need a custom card. An empty slot uses the default card.

## Exposed handle

No explicit exposed handle.

## Verification

- Focused tests: [ChipSelect.dom.test.ts](../../../../tests/unit/presentation/forms/ChipSelect.dom.test.ts) — the combobox field and its ARIA, the placeholder and label fallbacks, icon-only chip names and native titles for options without hints, a text chip for an option with no icon, the muted chip of a chosen empty option, the accessible-name summary (none, one, two, past three), `class` and attributes on the button and `isDisabled`; the overflow with the layout stubbed (`+3` when narrow, every chip when wide, every chip when nothing can be measured, a resize through the observer, a changed choice, `moreLabel` and its locale key); the panel (every option in order with icon, label and count, a localized count, `aria-selected` and the check, `data-empty` on an unchosen zero count and not on a chosen one, a muted row still selectable, per-click toggling of a multiple select that keeps the panel open, a single pick that writes a string, closes and clears through "Any", re-picking the chosen row, uncontrolled `defaultValue`); the keyboard (arrows open, arrows Home End move the active option, Enter and Space toggle, Enter picks and closes a single panel, Escape returns focus to the field, Tab trapped in a modal panel); and the hints (hover after `hintOpenDelay`, image or icon, no count line without a count, the keyboard-active row, no tooltip and no extra DOM without a hint, the 700 ms default, `hintCountLabel`, `hintFadeDuration`, none on the field).
- Layout: [ChipSelect.browser.test.ts](../../../../tests/unit/presentation/forms/ChipSelect.browser.test.ts) — in real Chromium a wide field shows all eight chips inside it and a `200px` one shows a `+N` chip that stays inside it with no page scrollbar, the chip count follows the container as it narrows and widens, the field is `18rem` in a wide container, between `12rem` and `18rem` in a middling one and never wider than the container, the panel opens below the field at least as wide as it with a check on each chosen row and an empty row at `opacity-60`, a real Enter opens it, Arrow keys, Home, End, Enter and Space choose, Tab and Shift+Tab stay in the listbox and Escape returns focus to the field, row hover and keyboard hints work, and a selected chip opens its hint outside the clipped field, and on a 375px screen the panel stays inside the viewport.
- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts) and the `ChipSelect` demo in the playground's forms group. This covers render/SSR compatibility, not all interaction behavior.
