# CollapsibleGroupContentInner

Renders the animating inner pane of a `CollapsibleGroupContent`, growing its height as the pane opens.

Source: [CollapsibleGroupContentInner.vue](CollapsibleGroupContentInner.vue).

Internal implementation: compose through the family’s public exports in [index.ts](index.ts).

## Contract

- Mount within the owner supplying `useCollapsibleContext`; a compound part is not an independent root.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `isForceMounted` | `boolean` | no | `undefined` | The force-mounted mode — keeps the pane in the DOM while closed. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- This internal part is exercised through its owning family; no independent public render fixture is claimed.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
