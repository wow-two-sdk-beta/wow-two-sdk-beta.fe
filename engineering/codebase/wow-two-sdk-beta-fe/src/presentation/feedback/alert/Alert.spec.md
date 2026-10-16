# Alert

Renders an icon, title, description, and actions laid over the `AlertSimple` atom.

Source: [Alert.vue](Alert.vue).

Public import: `import { Alert } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `severity` | `Severity` | no | — | The semantic severity palette. |
| `icon` | `string` | no | — | The optional leading icon. Rich content → the `icon` slot. |
| `title` | `string` | no | — | The bold heading line. Rich content → the `title` slot. |
| `description` | `string` | no | — | The body text below the title. Rich content → the `description` slot. |
| `actions` | `string` | no | — | The right-side action slot (typically Button(s)). Rich content → the `actions` slot. |
| `closeLabel` | `string` | no | `'Dismiss'` | The accessible label for the close button. Default `"Dismiss"`. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `close` | `close: [];` | Fires when the close button is activated. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The extra content below the description. |
| `icon` | `icon?(): unknown;` | The leading icon. Falls back to the `icon` prop. |
| `title` | `title?(): unknown;` | The heading line. Falls back to the `title` prop. |
| `description` | `description?(): unknown;` | The body text below the title. Falls back to the `description` prop. |
| `actions` | `actions?(): unknown;` | The action row. Falls back to the `actions` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Overlays.contract.dom.test.ts](../../../../tests/unit/presentation/overlays/Overlays.contract.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
