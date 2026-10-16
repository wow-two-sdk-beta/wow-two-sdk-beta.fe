# Status

Renders a coloured dot beside a text label — server status, online presence, build state.

Source: [Status.vue](Status.vue).

Public import: `import { Status } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `tone` | `StatusTone` | no | `StatusTone.Success` | The semantic tone of the dot. Default `success`. |
| `hasPulse` | `boolean` | no | `undefined` | The optional pulsing ring around the dot. |
| `size` | `StatusSize` | no | `StatusSize.Md` | The visual size — drives dot dimensions, text size, and gap. Default `md`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
