# ActionSheet

Renders an iOS-style action sheet — a bottom `Drawer` of stacked button rows and a split Cancel.

Source: [ActionSheet.vue](ActionSheet.vue).

Public import: `import { ActionSheet } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Behavior

- Picking an `ActionSheetAction` fires its `select`, then closes the sheet; `ActionSheetCancel` only closes it.
- The dialog is named by `title`; every attribute but `class` (an `aria-label` for a title-less sheet, `data-*`)
  reaches the dialog panel.
- Regression: `tests/unit/presentation/overlays/SheetsAndHoverCard.dom.test.ts`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `open` | `boolean` | no | `undefined` | The open state, controlled. The `v-model:open` binding target. |
| `defaultOpen` | `boolean` | no | `false` | The initial open state when uncontrolled. Default `false`. |
| `title` | `string` | no | `undefined` | The heading above the action rows. Use the `title` slot for rich content. |
| `description` | `string` | no | `undefined` | The supporting line under the heading. Use the `description` slot for rich content. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:open` | `'update:open': [open: boolean];` | Fires when the sheet opens or closes — the `v-model:open` half. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The action rows — `ActionSheetAction` / `ActionSheetCancel`. the default slot. |
| `title` | `title?(): unknown;` | The heading, when it is richer than the `title` string prop. |
| `description` | `description?(): unknown;` | The supporting line, when it is richer than the `description` string prop. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
