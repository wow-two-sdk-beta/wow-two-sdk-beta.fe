# TabsGroup

Renders the tabs root that owns the active value and shares it with its parts.

Source: [TabsGroup.vue](TabsGroup.vue).

Public import: `import { TabsGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `modelValue` | `string` | no | `undefined` | The controlled active tab value. |
| `defaultValue` | `string` | no | `undefined` | The uncontrolled initial tab value. |
| `orientation` | `Orientation` | no | `OrientationValue.Horizontal` | The layout axis. Default `horizontal`. |
| `activationMode` | `TabsGroupActivationMode` | no | `TabsGroupActivationModeValue.Automatic` | Whether focus alone activates a tab. Default `automatic`. |
| `isSkeleton` | `boolean` | no | `undefined` | Keeps every tab's box and draws its label as a bar; panel content draws its own skeletons. Defaults to the nearest `DataRegion` first load. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string];` | Fires when the reader selects a different tab, with its value. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
