# AvatarGroup

Renders a stack of overlapping `Avatar` children, with a "+N more" chip once they exceed `max`.

Source: [AvatarGroup.vue](AvatarGroup.vue).

Public import: `import { AvatarGroup } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `max` | `number` | no | `undefined` | The maximum avatars to render. Excess is shown as a "+N" tile. |
| `size` | `AvatarSize` | no | `SizePreset.Md` | The avatar size applied to all children. Default `md`. |
| `overlap` | `string` | no | `'-ml-2'` | The negative-margin overlap class applied between avatars. Default `-ml-2`. |

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
