# ToolbarSeparator

Renders a hairline rule between two toolbar groups, turned across the toolbar's own axis.

Source: [ToolbarSeparator.vue](ToolbarSeparator.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useToolbarContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
