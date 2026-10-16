# ReactionBar

Renders a row of reaction chips with an optional trailing add-reaction button.

Source: [ReactionBar.vue](ReactionBar.vue).

Public import: `import { ReactionBar } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `reactions` | `ReadonlyArray<Reaction>` | yes | `() => []` | Declared by the source contract. |
| `hasAddButton` | `boolean` | no | `true` | The trailing "add reaction" button's visibility. Default true. |
| `isCompact` | `boolean` | no | `undefined` | The compact mode — emoji only, no counts. |
| `hasEmpty` | `boolean` | no | `false` | The empty-chip visibility — renders chips with `count === 0`. Default false. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `react` | `react: [key: string];` | Fires when the reader toggles a reaction chip, with that chip's key. |
| `add` | `add: [];` | Fires when the trailing "add" button is activated (opens a picker). |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `emoji` | `emoji(props: { reaction: Reaction; index: number }): unknown;` | The chip glyph override, per reaction. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [DisplayRequiredProps.dom.test.ts](../../../../tests/unit/presentation/display/DisplayRequiredProps.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
