# MenuSub

Renders only its slot, owning the open state of one nested submenu.

Source: [MenuSub.vue](MenuSub.vue).

Public import: `import { MenuSub } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Mount within `Menu` (or another `MenuSubContent`) and hold exactly one `MenuSubTrigger` and one `MenuSubContent`.
- The open state uses the shared controlled-state helper: `open` / `update:open`, seeded by `defaultOpen`. A controlled submenu opens only when its caller applies the request.
- Opening one submenu closes any sibling submenu of the same menu; closing the parent menu unmounts the submenu.
- Unmount releases the parent menu's record of this submenu.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the submenu opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | One `MenuSubTrigger` and one `MenuSubContent`. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts).
- Focused tests: [MenuVector.dom.test.ts](../../../../tests/unit/presentation/nav/MenuVector.dom.test.ts) — sibling exclusivity and controlled requests.
