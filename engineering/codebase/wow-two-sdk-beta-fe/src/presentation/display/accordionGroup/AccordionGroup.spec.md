# AccordionGroup

Renders a vertical disclosure group that owns the open set and shares it with its items.

Source: [AccordionGroup.vue](AccordionGroup.vue).

Public import: `import { AccordionGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Each controlled axis has one Vue model name and one update event. Primary values use `modelValue` / `update:modelValue`; disclosure uses `open` / `update:open`. Named axes use their declared `update:*` event. Defaults seed uncontrolled state once; external updates do not emit intent.
- The committed state uses the shared controlled-state helper: supplied controlled state is read from props; user changes report intent. The default seeds uncontrolled state. External prop updates do not themselves emit user changes.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `type` | `AccordionGroupType` | no | `AccordionGroupType.Single` | The selection mode — one open panel (`single`) or many (`multiple`). Default `single`. |
| `modelValue` | `string \| ReadonlyArray<string>` | no | `undefined` | The controlled open value — a string when `single`, an array when `multiple`. |
| `defaultValue` | `string \| ReadonlyArray<string>` | no | `undefined` | The initial open value when uncontrolled. |
| `isCollapsible` | `boolean` | no | `false` | The click-to-close behaviour for the open panel. `single` mode only. Default `false`. |
| `isDisabled` | `boolean` | no | `false` | The disabled state for every item in the group. Default `false`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `update:modelValue` | `'update:modelValue': [value: string \| ReadonlyArray<string>];` | Fires when the reader opens or closes a panel, with the new open value. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el: computed(() => group.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
