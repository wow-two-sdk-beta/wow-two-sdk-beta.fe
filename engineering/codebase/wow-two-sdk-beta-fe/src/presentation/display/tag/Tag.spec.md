# Tag

Renders a pill with an optional close button, shown only when the consumer binds `@close`.

Source: [Tag.vue](Tag.vue).

Public import: `import { Tag } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `TagVariant` | no | — | The color treatment. |
| `closeLabel` | `string` | no | `'Remove'` | The accessible label for the close button. Default `"Remove"`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `close` | `close: [];` | Fires when the close (×) button is clicked. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Forms.regression.dom.test.ts](../../../../tests/unit/presentation/forms/Forms.regression.dom.test.ts), [InputInteraction.dom.test.ts](../../../../tests/unit/presentation/forms/InputInteraction.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
