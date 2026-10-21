# PopoverContent

Renders the anchored, dismissable popover panel.

Source: [PopoverContent.vue](PopoverContent.vue).

Public import: `import { PopoverContent } from '@wow-two-beta/fe/presentation/overlays';`.

## Contract

- Focus trap, loop and background modality all follow the root isModal value.
- Escape dismissal restores the trigger; outside-pointer dismissal preserves the selected outside target.
- Mount within the owner supplying `usePopoverContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isBare` | `boolean` | no | — | The bare toggle — skips the surface chrome (bg/border/shadow); keeps only z-index + animation. |
| `variant` | `SurfaceVariant` | no | `raised` | The visual recipe — `raised` draws an opaque popover fill, a visible border and a large shadow; `glass-menu` the theme's menu glass (`--glass-menu-fill`, `--glass-edge`, `--glass-menu-shadow`). |
| `tone` | `SurfaceTone` | no | — | The color tone the recipe is tinted with. |
| `radius` | `SurfaceRadius` | no | — | The corner rounding. |
| `padding` | `SurfacePadding` | no | — | The inner spacing step. Defaults to `lg` with chrome on, `none` when bare. |
| `elevation` | `SurfaceElevation` | no | — | The shadow depth. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [KeyboardExit.browser.test.ts](../../../../tests/unit/presentation/forms/KeyboardExit.browser.test.ts), [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
