# Table

Renders the table root and its scroll wrapper, sharing density and striping with its sections.

Source: [Table.vue](Table.vue).

Public import: `import { Table } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Below `stackBreakpoint` (default `md`) a `stack` table renders one card per body and footer row, each cell a line of
  label then value; the wrapper drops its frame and nothing scrolls sideways. From `stackBreakpoint` up it is the
  plain table. `phoneLayout: 'scroll'` keeps the plain table everywhere, scrolling sideways inside the wrapper.
- A cell's label is its column's header text (the last header row; a header spanning columns labels each), kept in
  step as rows or header text change. A cell's own `label` wins; a cell spanning columns gets none. Labels are
  written after mount, so a server render carries only the explicit ones.
- Stacked, `TableHead` becomes a bar of the header's controls (sort buttons, select-all) above the cards; a header
  cell holding no control, or a head holding none, is visually hidden and stays for assistive technology.
  `hasStickyHeader` pins that bar.
- While stacking every part restates its ARIA role (`table`, `rowgroup`, `row`, `columnheader` / `rowheader`, `cell`):
  CSS that unbuilds a table drops the native semantics in some engines. Each part carries `data-stack` with the
  breakpoint, which the `table-stacked:` variant in `index.css` reads; an app that skips that stylesheet keeps the
  plain table.
- Assistive technology reads the stacked label with its value, so a swipe through the cards names each value.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isStriped` | `boolean` | no | `false` | Declared by the source contract. |
| `isHoverable` | `boolean` | no | `false` | Declared by the source contract. |
| `density` | `TableDensity` | no | `TableDensity.Cozy` | Declared by the source contract. |
| `isBare` | `boolean` | no | `false` | Declared by the source contract. |
| `radius` | `TableRadius` | no | `TableRadius.Md` | The corner radius of the scroll wrapper (ignored when `isBare`). |
| `containerClassName` | `string` | no | `undefined` | Classes for the scroll wrapper (ignored when `isBare`). A fallthrough `class` lands on the inner `<table>`. |
| `hasStickyHeader` | `boolean` | no | `false` | Pins `TableHead` on an opaque fill while the body scrolls — inside the wrapper (give it a height through `containerClassName`), or the nearest scrolling ancestor when `isBare`. |
| `phoneLayout` | `TablePhoneLayout` | no | `stack` | Below `stackBreakpoint`: `stack` (a card per row) or `scroll` (the table, scrolling sideways). |
| `stackBreakpoint` | `Breakpoint` | no | `md` | Rows stack into cards below this breakpoint. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [TableStacking.dom.test.ts](../../../../tests/unit/presentation/display/TableStacking.dom.test.ts),
  [TableStacked.browser.test.ts](../../../../tests/unit/presentation/display/TableStacked.browser.test.ts),
  [TableStickyHeader.browser.test.ts](../../../../tests/unit/presentation/display/TableStickyHeader.browser.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
