# AnnotationBadge

Renders a focusable annotation marker around content, or a bare numbered chip with `isPinOnly`.

Source: [AnnotationBadge.vue](AnnotationBadge.vue).

Public import: `import { AnnotationBadge } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `index` | `number \| string` | no | — | The numeric badge / index shown in the pin. Rich content → the `index` slot. |
| `tone` | `AnnotationTone` | no | `'comment'` | The tone — drives the highlight color. |
| `isPinOnly` | `boolean` | no | — | The pin-only mode — a small floating pin without underline. |
| `isResolved` | `boolean` | no | — | The resolved state (dimmed, struck-through highlight). |
| `isActive` | `boolean` | no | — | The active state — the currently focused / hovered annotation. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown;` | The wrapped text or content the annotation refers to. Omit for a standalone pin. |
| `index` | `index?(): unknown;` | The rich override for the pin's badge — replaces the `index` prop. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
