# TimelineItem

Renders one rail node — marker and connector column, then the content column.

Source: [TimelineItem.vue](TimelineItem.vue).

Public import: `import { TimelineItem } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useTimelineContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `status` | `TimelineStatus` | no | `TimelineStatus.Default` | The semantic tone of the node marker. Default `default`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon?(): unknown;` | The marker glyph — the legacy `icon` node prop. Defaults to a filled dot. |
| `default` | `default(): unknown;` | The node content — the default slot. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
