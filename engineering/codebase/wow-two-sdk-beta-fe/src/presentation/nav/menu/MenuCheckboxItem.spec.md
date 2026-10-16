# MenuCheckboxItem

Renders a menu row that toggles one boolean option and marks it with a check.

Source: [MenuCheckboxItem.vue](MenuCheckboxItem.vue).

Public import: `import { MenuCheckboxItem } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within `Menu` (directly or through `DropdownMenuContent`, `ContextMenuContent`, `MenubarContent` or `MenuSubContent`); a compound part is not an independent root.
- The checked state uses the shared controlled-state helper: `modelValue` / `update:modelValue`, seeded by `defaultValue` when uncontrolled. External prop updates do not emit.
- `isIndeterminate` is caller-owned: the row announces `aria-checked="mixed"` and draws a dash; the next toggle requests `true`, and the caller clears the mixed flag.
- Unmount disposes the menu registration.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `boolean` | no | `undefined` | The checked state, controlled. The `v-model` binding target. |
| `defaultValue` | `boolean` | no | `false` | The initial checked state when uncontrolled. |
| `isIndeterminate` | `boolean` | no | `false` | The mixed state; the next toggle checks the row. |
| `state` | `MenuItemState` | no | `undefined` | The visual state of the row. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state — blocks toggling and removes the row from the arrow walk. |
| `canCloseOnSelect` | `boolean` | no | `true` | Closes the whole menu tree after a toggle; `false` keeps it open to flip several rows. |
| `closeOnSelect` | `boolean` | no | —      | Deprecated — use `canCloseOnSelect`; removed next release.                             |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [checked: boolean];` | Fires when the reader toggles the row — the `v-model` half. |
| `select` | `select: [];` | Fires after each toggle from Enter, Space or a click. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The row label. |
| `indicator` | `indicator?(props: { checked: boolean; isIndeterminate: boolean }): unknown` | The check mark override, drawn in the fixed leading column. |

## Exposed handle

`{ el }` — the row `<button>`. Read it through a component template ref after mount.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts) — toggling, mixed state, opt-out close, disabled rows and the shared arrow walk.

## Interaction guarantees

The row renders `role="menuitemcheckbox"` with `aria-checked` and `data-state` (`checked` · `unchecked` · `indeterminate`). Enter, Space and a click toggle it; Arrow, Home and End walk every enabled row kind of its menu. A mouse move focuses the row so pointer and keyboard share one highlight; touch and pen only activate.
