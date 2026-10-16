# InputAddonLayout

Renders leading and trailing addons welded to an input's border — protocol prefixes, units, suffixes.

Source: [InputAddonLayout.vue](InputAddonLayout.vue).

Public import: `import { InputAddonLayout } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `leading` | `string \| number` | no | — | The text rendered to the left of the input (e.g. "https://"). Fill the `leading` slot for richer content. |
| `trailing` | `string \| number` | no | — | The text rendered to the right of the input (e.g. ".com"). Fill the `trailing` slot for richer content. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | See the declared signature. |
| `leading` | `leading?(): unknown;` | See the declared signature. |
| `trailing` | `trailing?(): unknown;` | See the declared signature. |

## Exposed handle

`{ el: root }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FormsExamples.ts](../../../../apps/playground/src/gallery/fixtures/FormsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
