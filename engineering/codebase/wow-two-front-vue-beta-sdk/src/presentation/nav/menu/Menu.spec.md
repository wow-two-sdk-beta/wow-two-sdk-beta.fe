# Menu

Renders the anchored, focus-trapped menu surface the arrow keys walk.

Source: [Menu.vue](Menu.vue).

Public import: `import { Menu } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop        | Type                  | Required | Default          | Meaning                                                                                       |
| ----------- | --------------------- | -------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `open`      | `boolean`             | no       | `undefined`      | Controlled axes use their canonical Vue model names; each update event requests caller state. |
| `anchor`    | `HTMLElement \| null` | yes      | —                | The element the surface anchors to.                                                           |
| `placement` | `Placement`           | no       | `'bottom-start'` | The Floating UI placement. Default `bottom-start`.                                            |
| `offset`    | `number`              | no       | `6`              | The distance between anchor and surface in px. Default 6.                                     |
| `variant`   | `SurfaceVariant`      | no       | `undefined`      | The visual recipe. Default `raised`.                                                          |
| `tone`      | `SurfaceTone`         | no       | `undefined`      | The color tone the recipe is tinted with.                                                     |
| `radius`    | `SurfaceRadius`       | no       | `undefined`      | The corner rounding. Default `md`.                                                            |
| `padding`   | `SurfacePadding`      | no       | `undefined`      | The inner spacing step. Default `xs`.                                                         |
| `elevation` | `SurfaceElevation`    | no       | `undefined`      | The shadow depth.                                                                             |

## Emits

| Event         | Signature                          | Meaning                                                                                                                                                                |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `update:open` | `'update:open': [open: boolean];`  | Fires when the menu should update:open — Escape, an outside pointerdown, Tab, or a selection.                                                                          |
| `keydown`     | `keydown: [event: KeyboardEvent];` | Fires when a key goes down on the menu container, ahead of the menu's own Tab handling, so a wrapper (Menubar) can add navigation and opt out with `preventDefault()`. |

## Slots

| Slot      | Signature            | Meaning                     |
| --------- | -------------------- | --------------------------- |
| `default` | `default(): unknown` | The rows — `MenuItem`, `MenuCheckboxItem`, `MenuRadioGroup`, `MenuSub`, `MenuGroup`, `MenuLabel`, `MenuSeparator`. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [LiveValues.dom.test.ts](../../../../tests/unit/presentation/nav/LiveValues.dom.test.ts) · [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

## Interaction guarantees

`returnFocus` passes through to FocusScope. Typeahead matches the live DOM order and labels, skips disabled items and avoids intercepting editable children. Composition and caller-cancelled keys remain untouched.

A mouse move over an enabled row focuses it, so pointer and keyboard share one highlight; leaving a row returns focus to the surface. Touch and pen never move the highlight.

## Menu trees

- A `Menu` rendered by `MenuSubContent` is a submenu; every other `Menu` roots its own tree.
- A selection or Tab anywhere in the tree closes the root, which emits `update:open`; submenus unmount with it.
- Escape and an outside press close the topmost surface first. A submenu closes the whole tree for a press on the page and only itself for a press on a sibling surface or the root anchor.
- A submenu does not trap focus; the root's focus scope contains every submenu surface through its logical descendants.
- Only one sibling submenu stays open. A mouse resting on another row closes it after 250 ms unless the pointer reaches the submenu; an arrow-key or typeahead move to another row closes it at once.
