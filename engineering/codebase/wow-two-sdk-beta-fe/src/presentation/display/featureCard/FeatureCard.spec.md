# FeatureCard

Renders a marketing feature tile — tinted icon badge, title, description — in an outlined card.

Source: [FeatureCard.vue](FeatureCard.vue).

Public import: `import { FeatureCard } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | `string \| number` | yes | — | The feature title. a scalar stays a prop so it remains the discriminator, and the same-named slot is the rich override. |
| `description` | `string \| number` | no | `undefined` | The optional supporting copy below the title. Falls back to the default slot when omitted. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon(): unknown;` | The icon node rendered inside a tinted badge (`bg-primary-soft text-primary-soft-foreground`). Size it yourself. |
| `title` | `title(): unknown;` | The feature title — overrides the `title` prop's rendering. |
| `description` | `description(): unknown;` | The supporting copy — overrides the `description` prop's rendering. |
| `default` | `default(): unknown;` | The body content — used when neither `description` nor its slot is provided. |

## Exposed handle

`{ el: HTMLElement | null }` targets the inner Card or RovingFocusGroup DOM root, not its component instance. Read after mount; the handle is null before mount and after the child unmounts. It is suitable for native focus, measurement and scrolling; it does not expose child implementation methods.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
