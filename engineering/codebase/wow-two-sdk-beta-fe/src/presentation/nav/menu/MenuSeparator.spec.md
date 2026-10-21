# MenuSeparator

Renders the hairline rule between menu sections.

Source: [MenuSeparator.vue](MenuSeparator.vue).

Public import: `import { MenuSeparator } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- The rule bleeds `0.25rem` past its parent's inline edges (`-mx-1`) to meet the edges of a surface with the default
  `xs` padding. A scrolling panel inside the surface spans that padding (`-mx-1 px-1`) so the bleed stays inside its
  scroll box; otherwise the rule overflows it and draws a sideways scrollbar.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
