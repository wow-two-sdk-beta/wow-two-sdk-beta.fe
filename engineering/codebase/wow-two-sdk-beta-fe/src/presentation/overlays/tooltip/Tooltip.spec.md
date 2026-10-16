# Tooltip

Renders a hover- or focus-triggered tooltip into a Portal, positioned by Floating UI.

Source: [Tooltip.vue](Tooltip.vue).

Public import: `import { Tooltip } from '@wow-two-beta/fe/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Unmount disposes the subscriptions, listeners or timers registered by this implementation.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- The trigger clone is built during render, so its anchor ref is owned by the rendering tooltip; a consumer ref on the trigger is kept beside it.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `content` | `string \| number` | no | `undefined` | The tooltip body. Rich content goes through the `content` slot. |
| `placement` | `Placement` | no | `'top'` | The Floating UI placement. Default `top`. |
| `openDelay` | `number` | no | `700` | The delay before opening on hover, in ms. Default 700. |
| `closeDelay` | `number` | no | `0` | The delay before closing on leave, in ms. Default 0. |
| `open` | `boolean` | no | `undefined` | Controlled axes use their canonical Vue model names; each update event requests caller state. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled mode — suppresses rendering even on hover (e.g. when content is empty). |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the tooltip shows or hides — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The single child element — the trigger. Receives the handlers, the ref, and `aria-describedby`. |
| `content` | `content?(): unknown;` | The rich override for the `content` prop. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.

Disabling clears pending delays and closes uncontrolled state; re-enabling cannot resurrect an old hover timer.
