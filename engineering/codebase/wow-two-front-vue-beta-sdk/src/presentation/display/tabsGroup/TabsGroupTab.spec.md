# TabsGroupTab

Renders one tab button; the selected tab is the roving tab stop, per APG.

Source: [TabsGroupTab.vue](TabsGroupTab.vue).

Public import: `import { TabsGroupTab } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Mount within the owner supplying `useTabsContext`, `useRovingFocusItem`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.
- Inside a skeleton `TabsGroup` or a `DataRegion` first load, the tab keeps its box, draws its label as a bar, hides
  the active underline and is `inert`.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `string` | yes | — | The value this tab selects — pairs it with the `TabsGroupPanel` of the same value. |
| `isDisabled` | `boolean` | no | `false` | The disabled state. Default `false`. |

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
