# CountBadge

Renders a numeric count badge showing `value` or `{max}+` past the cap, hidden at zero by default.

Source: [CountBadge.vue](CountBadge.vue).

Public import: `import { CountBadge } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `value` | `number` | yes | — | The numeric count. |
| `max` | `number` | no | `99` | The cap value — shows "max+" when exceeded. Default 99. |
| `canHideZero` | `boolean` | no | `true` | The hide-when-zero mode — hides entirely when count is 0. Default true. |
| `variant` | `BadgeVariant` | no | `BadgeVariantValue.Danger` | The color treatment. the named `BadgeVariant` union it resolves to is used directly, because the SFC compiler cannot follow an indexed access into an imported interface. |

## Emits

None declared.

## Slots

None declared.

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
