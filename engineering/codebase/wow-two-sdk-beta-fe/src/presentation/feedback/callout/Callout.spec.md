# Callout

Renders an inline doc-style note — colored left rule, no fill, quieter than `Alert`.

Source: [Callout.vue](Callout.vue).

Public import: `import { Callout } from '@wow-two-beta/ui-vue/presentation/feedback';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `severity` | `Severity` | no | `SeverityToken.Info` | The semantic severity palette. |
| `icon` | `string` | no | — | The optional leading icon. Rich content → the `icon` slot. |
| `title` | `string` | no | — | The bold heading line. Rich content → the `title` slot. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The note body. |
| `icon` | `icon?(): unknown;` | The leading icon. Falls back to the `icon` prop. |
| `title` | `title?(): unknown;` | The heading line. Falls back to the `title` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [FeedbackExamples.ts](../../../../apps/playground/src/gallery/fixtures/FeedbackExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
