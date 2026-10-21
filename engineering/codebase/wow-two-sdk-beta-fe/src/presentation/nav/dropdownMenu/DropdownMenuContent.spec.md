# DropdownMenuContent

Renders the animated panel handed to `Menu` as its child.

Source: [DropdownMenuContent.vue](DropdownMenuContent.vue).

Public import: `import { DropdownMenuContent } from '@wow-two-beta/fe/presentation/nav';`.

## Contract

- Mount within the owner supplying `useDropdownMenuContext`; a compound part is not an independent root.
- `class` lands on the animated panel inside the surface; every other attribute reaches `Menu`, the surface, so
  `aria-label` and the surface props (`variant`, `tone`, `radius`, `padding`, `elevation`) set it.
- `variant="glass-menu"` paints the theme's menu glass: `--glass-menu-fill`, `--glass-blur`, `--glass-saturate`, the
  `--glass-edge` hairline and `--glass-menu-shadow`, opaque where blur is unavailable or
  `prefers-reduced-transparency` asks.
- A panel that scrolls (`max-h-*` with `overflow-y-auto`) spans the surface's inline padding (`-mx-1 px-1`), so a
  `MenuSeparator`'s bleed stays inside it; the ArrowUp open focuses the last row that is neither `disabled` nor
  `aria-disabled`.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

No declared props.

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
