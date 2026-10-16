# ScrollSpy

Renders nothing by default — hands the topmost in-view section's id to its default slot.

Source: [ScrollSpy.vue](ScrollSpy.vue).

Public import: `import { ScrollSpy } from '@wow-two-beta/ui-vue/presentation/nav';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Undeclared attributes follow Vue fallthrough to the rendered root when the component has a single element root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `ids` | `ReadonlyArray<string>` | yes | — | Declared by the source contract. |
| `rootMargin` | `string` | no | — | Declared by the source contract. |
| `threshold` | `number \| ReadonlyArray<number>` | no | — | Declared by the source contract. |
| `root` | `Element \| Document \| null` | no | — | Element to observe within. Defaults to viewport. |

## Emits

| Event | Signature | Meaning |
|---|---|---|
| `active-change` | `'active-change': [id: string \| null];` | Fires when a different section becomes the topmost in view; fires once on mount as well. |

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default?(props: { activeId: string \| null }): unknown;` | the legacy render-prop `children` — receives the currently-active section id. |

## Exposed handle

No explicit exposed handle.

## Verification

- Public render fixture: [NavExamples.ts](../../../../apps/playground/src/gallery/fixtures/NavExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
