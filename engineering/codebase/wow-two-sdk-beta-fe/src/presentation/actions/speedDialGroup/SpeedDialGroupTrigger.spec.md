# SpeedDialGroupTrigger

Renders the speed dial's pinned FAB, swapping its glyph as the dial opens and closes.

Source: [SpeedDialGroupTrigger.vue](SpeedDialGroupTrigger.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useSpeedDialContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ Omit<ButtonHTMLAttributes, 'children'>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `closedIcon` | `VNodeChild` | no | `undefined` | The glyph shown while closed. Defaults to a `Plus` icon. Prefer the `closed-icon` named slot. |
| `openIcon` | `VNodeChild` | no | `undefined` | The glyph shown while open. Defaults to an `X` icon. Prefer the `open-icon` named slot. |
| `variant` | `FabButtonVariant` | no | — | The FabButton surface style. |
| `size` | `FabButtonSize` | no | — | The FabButton diameter. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `open-icon` | `'open-icon'?(): unknown;` | The glyph shown while the dial is open. Falls back to `openIcon`, then to an `X` icon. |
| `closed-icon` | `'closed-icon'?(): unknown;` | The glyph shown while the dial is closed. Falls back to `closedIcon`, then to a `Plus` icon. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
