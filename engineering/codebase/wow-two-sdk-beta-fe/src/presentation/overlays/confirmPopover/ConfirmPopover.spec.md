# ConfirmPopover

Renders its trigger and, once pressed, an anchored panel that asks the reader to confirm or cancel one action.

Source: [ConfirmPopover.vue](ConfirmPopover.vue).

Public import: `import { ConfirmPopover } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- The default slot is the trigger: one element, merged through `PopoverTrigger as-child`.
- The open state uses the shared controlled-state helper: `open` / `update:open`, seeded by `defaultOpen`.
- `onConfirm` is a prop so the popover can await its result; `@confirm` binds it. A returned promise keeps the panel open with a busy confirm button, disables Cancel and dismissal, closes on resolve, and stays open with `error` on reject. A synchronous throw also emits `error`.
- `cancel` fires for every dismissal of an open popover — Cancel, Escape or an outside press — and never after a confirm.
- A result that settles after unmount, or after a newer confirm, is ignored.
- Attributes and `class` reach the panel; the panel is non-modal and named by the title, described by the description.
- Use `AlertModal` when the decision must block the page; this panel keeps the page usable.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. |
| `title` | `string` | yes | — | The question the popover asks; it names the panel. |
| `description` | `string` | no | `undefined` | The consequence under the title; `#description` is the rich override. |
| `confirmLabel` | `string` | no | `"Confirm"` | The confirm text; localized `ConfirmPopover.confirmLabel`. |
| `cancelLabel` | `string` | no | `"Cancel"` | The cancel text; localized `ConfirmPopover.cancelLabel`. |
| `tone` | `ColorTone` | no | `'primary'` | The confirm button tone; `danger` marks a destructive action. |
| `placement` | `Placement` | no | `'top'` | The Floating UI placement. |
| `offset` | `number` | no | `8` | The distance between trigger and panel in px. |
| `isDisabled` | `boolean` | no | `false` | The trigger does not open the popover and is marked `aria-disabled`. |
| `onConfirm` | `() => unknown` | no | — | Runs on confirm; a returned promise is awaited. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the popover opens or closes — the `v-model:open` half. |
| `cancel` | `cancel: [];` | Fires when the reader dismisses without confirming. |
| `error` | `error: [error: unknown];` | Fires when `onConfirm` throws or its promise rejects. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The trigger element. |
| `description` | `description?(): unknown` | The rich override for `description`. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts).
- Focused tests: [ConfirmPopover.dom.test.ts](../../../../tests/unit/presentation/overlays/ConfirmPopover.dom.test.ts) — naming, focus, cancel paths, sync and async confirm, rejection, disabled, controlled and localized text.

## Interaction guarantees

Opening moves focus to Cancel, the least destructive choice; closing returns focus to the trigger when the panel held it. Cancel precedes Confirm in DOM order.
