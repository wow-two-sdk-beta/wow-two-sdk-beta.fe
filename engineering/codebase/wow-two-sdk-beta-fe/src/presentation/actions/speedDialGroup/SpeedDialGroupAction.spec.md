# SpeedDialGroupAction

Renders one icon button of an open speed dial, with an optional label chip beside it.

Source: [SpeedDialGroupAction.vue](SpeedDialGroupAction.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useSpeedDialContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ SpeedDialGroupActionAttributes`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `icon` | `VNodeChild` | no | `undefined` | The action's glyph. Prefer the `icon` named slot; the optional glyph prop is also supported. |
| `tooltip` | `VNodeChild` | no | `undefined` | The label chip rendered beside the button. Prefer the `tooltip` named slot. |
| `type` | `ButtonType` | no | `ButtonType.Button` | The button type. Default `ButtonType.Button`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `select` | `select: [];` | Fires when the action is chosen — the dial closes and focus returns to the trigger afterwards. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon?(): unknown;` | The action's glyph. Preferred over the `icon` prop. |
| `default` | `default?(): unknown;` | The glyph, in the plain-children shape a Vue caller reaches for. Same slot as `icon`. |
| `tooltip` | `tooltip?(): unknown;` | The label chip beside the button. Preferred over the `tooltip` prop. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
