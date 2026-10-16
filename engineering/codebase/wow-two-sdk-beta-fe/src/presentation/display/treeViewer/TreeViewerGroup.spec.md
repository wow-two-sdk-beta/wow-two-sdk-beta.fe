# TreeViewerGroup

Renders an expandable branch of a `TreeViewer`.

Source: [TreeViewerGroup.vue](TreeViewerGroup.vue).

Public import: `import { TreeViewerGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useTreeContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The branch value — the key expansion is tracked under. |
| `label` | `string \| number` | yes | — | The branch label. the scalar stays a prop and the same-named `label` slot is the rich override. |
| `isDisabled` | `boolean` | no | `false` | The disabled state. Default `false`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The nested `TreeViewerGroup` / `TreeViewerItem` children — the default slot. |
| `label` | `label(): unknown;` | Overrides the branch label. Falls back to the `label` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
