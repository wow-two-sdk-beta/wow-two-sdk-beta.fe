# HoverCard

Renders only its slot, owning the open state and hover timing of the HoverCard tree below it.

Source: [HoverCard.vue](HoverCard.vue).

Public import: `import { HoverCard } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |
| `openDelay` | `number` | no | `700` | The hover dwell before opening, in ms. Default 700. |
| `closeDelay` | `number` | no | `300` | The grace period before closing, in ms. Default 300. |
| `placement` | `Placement` | no | `'bottom'` | The Floating UI placement. Default `bottom`. |
| `offset` | `number` | no | `8` | The distance between anchor and card in px. Default 8. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the card opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
