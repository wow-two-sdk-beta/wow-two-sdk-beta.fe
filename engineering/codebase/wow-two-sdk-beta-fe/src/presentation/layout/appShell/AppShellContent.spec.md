# AppShellContent

Renders the scrolling region inside `AppShellMain` — header, sidebar and footer stay put.

Source: [AppShellContent.vue](AppShellContent.vue).

Public import: `import { AppShellContent } from '@wow-two-beta/ui-vue/presentation/layout';`.

## Contract

- `gutter` pads the content (`none` · `sm` 1rem · `md` 1.5rem · `lg` widening from 1rem to 2rem with the viewport).
- `maxWidth` wraps the content in a centered container capped at a `ContainerLayoutSize` step or a CSS length; without
  it the content spans the region and no container renders.
- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `gutter` | `AppShellContentGutter` | no | `md` | The padding around the content. |
| `maxWidth` | `ContainerLayoutSize \| SizeValue` | no | — | Caps and centers the content; number = px. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(): unknown` | See the declared signature. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

## Verification

- Public render fixture: [LayoutExamples.ts](../../../../apps/playground/src/gallery/fixtures/LayoutExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
