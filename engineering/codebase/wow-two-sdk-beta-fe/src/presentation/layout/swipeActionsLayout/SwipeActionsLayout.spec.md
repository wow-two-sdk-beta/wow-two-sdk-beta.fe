# SwipeActionsLayout

Renders a row that drags left or right to reveal its action slots.

Source: [SwipeActionsLayout.vue](SwipeActionsLayout.vue).

Public import: `import { SwipeActionsLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Dragging past `threshold` snaps a side open; a tap on the content closes it.
- The actions stay in the tab order after the content. Focusing one slides its side open so the focused button is
  on screen; Escape or focus leaving the row closes it.
- Regression: `tests/unit/presentation/display/TextAvatarsSlides.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `threshold` | `number` | no | `60` | The drag distance (px) the user must exceed before the row snaps open. |
| `actionWidth` | `number` | no | `72` | The width per action button (px) — used to compute snap distance. |
| `isDisabled` | `boolean` | no | — | The gesture-off flag. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The row body. |
| `left` | `left?(): unknown;` | The actions revealed by dragging right. One element per action slot. |
| `right` | `right?(): unknown;` | The actions revealed by dragging left. One element per action slot. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
