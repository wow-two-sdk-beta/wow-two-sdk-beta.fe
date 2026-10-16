# Breadcrumb

Renders a linear trail of links and separators marking where the reader stands.

Source: [Breadcrumb.vue](Breadcrumb.vue).

Public import: `import { Breadcrumb } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Each ancestor is a native anchor in normal Tab order; the current item is aria-current=page.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `items` | `ReadonlyArray<BreadcrumbItem>` | yes | — | Declared by the source contract. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `label` | `label?(props: { item: BreadcrumbItem; index: number }): unknown;` | The rich override for an item's `label`. |
| `separator` | `separator?(): unknown;` | The custom separator element. the legacy `separator` prop; defaults to a chevron-right icon. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [KeyboardExit.browser.test.ts](../../../../tests/unit/presentation/forms/KeyboardExit.browser.test.ts), [PreviewTrust.dom.test.ts](../../../../tests/unit/presentation/forms/PreviewTrust.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
