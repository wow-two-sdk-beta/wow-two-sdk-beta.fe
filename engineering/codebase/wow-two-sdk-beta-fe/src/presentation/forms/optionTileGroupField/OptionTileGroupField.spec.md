# OptionTileGroupField

Renders a named `<fieldset>` around a row of option tiles, disabling every tile at once.

Source: [OptionTileGroupField.vue](OptionTileGroupField.vue).

Public import: `import { OptionTileGroupField } from '@wow-two-beta/ui-vue/presentation/forms';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string` | yes | — | The group's accessible name. |
| `isDisabled` | `boolean` | no | `undefined` | The disabled state. Falls back to the surrounding field's `isDisabled`. |
| `disabled` | `boolean` | no | `undefined` | Deprecated alias of `isDisabled`; removed next release. |
| `canWrap` | `boolean` | no | `undefined` | Lets tiles flow onto multiple rows. Default `false` (single row).             |
| `wrap` | `boolean` | no | —           | Deprecated — use `canWrap`; removed next release.                             |
| `align` | `Align` | no | — | The main-axis alignment of the tiles. Default `start`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The `OptionTilePicker` children the fieldset groups and disables together. |

## Exposed handle

`{ el: computed(() => root.value?.el ?? null) }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
