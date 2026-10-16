# LinkItem

Renders a styled anchor with consistent focus and hover treatment, or lends its styling to a router link.

Source: [LinkItem.vue](LinkItem.vue).

Public import: `import { LinkItem } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- The built-in anchor filters href to supported navigation schemes or relative URLs. A custom asChild/router child owns its navigation contract.
- URL bindings select an allowed scheme through UrlExtensions before rendering. Custom slots remain caller-owned content.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

Inherited contracts: `extends /* @vue-ignore */ AnchorHTMLAttributes, /* @vue-ignore */ Omit<LinkItemVariants, 'variant' | 'size'>`. These members remain part of the component surface.

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `variant` | `LinkItemVariant` | no | — | The color treatment. |
| `size` | `LinkItemSize` | no | — | The text size. |
| `asChild` | `boolean` | no | `false` | The as-child flag — when true, renders the child element as the link instead of an `<a>`. Use for a router `<RouterLink>`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown;` | The link text, or — under `asChild` — the single element that becomes the link. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [ActionsExamples.ts](../../../../apps/playground/src/gallery/fixtures/ActionsExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [PreviewTrust.dom.test.ts](../../../../tests/unit/presentation/forms/PreviewTrust.dom.test.ts). Consult the named test assertions for the behavior actually covered.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
