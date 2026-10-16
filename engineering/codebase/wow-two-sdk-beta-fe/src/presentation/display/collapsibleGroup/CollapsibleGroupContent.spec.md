# CollapsibleGroupContent

Renders the disclosure pane, kept mounted by `Presence` until its close animation ends.

Source: [CollapsibleGroupContent.vue](CollapsibleGroupContent.vue).

Public import: `import { CollapsibleGroupContent } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useCollapsibleContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isForceMounted` | `boolean` | no | `undefined` | The force-mounted mode — renders hidden content but keeps it in the DOM (for animations). |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
