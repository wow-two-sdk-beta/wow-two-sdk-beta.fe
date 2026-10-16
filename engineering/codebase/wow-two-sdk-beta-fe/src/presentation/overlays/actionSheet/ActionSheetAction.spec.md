# ActionSheetAction

Renders one action row of an `ActionSheet`; it fires `select`, then closes the sheet.

Source: [ActionSheetAction.vue](ActionSheetAction.vue).

Public import: `import { ActionSheetAction } from '@wow-two-beta/ui-vue/presentation/overlays';`.

## Contract

- Mount within the owner supplying `useActionSheetContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isDestructive` | `boolean` | no | `false` | The destructive tone — renders the label in the danger color. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when the reader picks this row, just before the sheet closes. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [OverlaysExamples.ts](../../../../apps/playground/src/gallery/fixtures/OverlaysExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
