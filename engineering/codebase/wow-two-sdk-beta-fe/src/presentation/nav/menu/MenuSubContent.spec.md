# MenuSubContent

Renders the submenu surface beside its trigger row while the `MenuSub` is open.

Source: [MenuSubContent.vue](MenuSubContent.vue).

Public import: `import { MenuSubContent } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within `MenuSub`, after its `MenuSubTrigger`. The surface is a `Menu`, so every menu row kind works inside it, including further submenus.
- The surface mounts only while open; a closed submenu keeps no positioner, focus scope or dismiss layer.
- The surface owns its `id` and `aria-labelledby` (the trigger row); other attributes and `class` reach the surface.
- It opens on the trigger's inline-end side (`right-start`, or `left-start` right to left) and flips to stay in view.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `offset` | `number` | no | `2` | The distance between the trigger row and the surface in px. |
| `variant` | `SurfaceVariant` | no | `undefined` | The visual recipe. Default `surface`. |
| `tone` | `SurfaceTone` | no | `undefined` | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | `undefined` | The corner rounding. Default `md`. |
| `padding` | `SurfacePadding` | no | `undefined` | The inner spacing step. Default `xs`. |
| `elevation` | `SurfaceElevation` | no | `undefined` | The shadow depth. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The submenu rows. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts).

## Interaction guarantees

- Selecting any row, or Tab, closes the whole menu tree.
- Escape or the inline-start arrow closes only this level and returns focus to the trigger row when the surface held it.
- A press on another surface of the same tree closes only this level; a press on the page closes the tree.
- A keyboard open focuses the first enabled row; a pointer open leaves focus on the trigger row.
- The submenu does not trap focus: the root menu's scope owns the whole tree.
