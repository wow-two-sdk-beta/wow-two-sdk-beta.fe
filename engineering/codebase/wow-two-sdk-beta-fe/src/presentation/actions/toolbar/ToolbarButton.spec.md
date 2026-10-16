# ToolbarButton

Renders one action button inside a toolbar, taking its turn in the group's roving tab stop.

Source: [ToolbarButton.vue](ToolbarButton.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useRovingFocusItem`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ Omit<ButtonHTMLAttributes, 'children'>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `asChild` | `boolean` | no | `false` | The as-child flag — renders as the single child via `Primitive`, dropping item chrome. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The button's label, or — under `asChild` — the single element that becomes the item. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
