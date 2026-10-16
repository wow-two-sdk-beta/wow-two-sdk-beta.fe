# PricingCard

Renders a pricing tier: name, price baseline, tagline, checked feature list, bottom-pinned CTA.

Source: [PricingCard.vue](PricingCard.vue).

Public import: `import { PricingCard } from '@wow-two-beta/ui-vue/presentation/display';`.

## Contract

- Compose using the props, slots and events below. Preserve the rendered element’s native semantics and provide the required content/data.
- Automatic attribute inheritance is disabled; the source explicitly forwards and merges supported fallthrough attributes.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `name` | `string \| number` | yes | — | The tier name (e.g. "Pro"). a scalar stays a prop so it remains the discriminator, and the same-named slot is the rich override. The same pairing applies to `price` / `cadence` / `tagline` / `badgeLabel` below. |
| `price` | `string \| number` | yes | — | The headline price (e.g. "$9"). |
| `cadence` | `string \| number` | no | `undefined` | The billing cadence beside the price (e.g. "/mo"). |
| `tagline` | `string \| number` | no | `undefined` | The short positioning line below the price. |
| `features` | `ReadonlyArray<string \| number>` | yes | — | The feature bullets — each rendered with a leading `Check`. The scoped `feature` slot overrides a row. |
| `isFeatured` | `boolean` | no | `false` | The featured state — highlights this tier with a primary border + shadow + a badge. |
| `featured` | `boolean` | no | —       | Deprecated — use `isFeatured`; removed next release.                                |
| `badgeLabel` | `string \| number` | no | `'Most popular'` | The badge label shown when `featured`. Default "Most popular". |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `name` | `name(): unknown;` | The tier name — overrides the `name` prop's rendering. |
| `price` | `price(): unknown;` | The headline price — overrides the `price` prop's rendering. |
| `cadence` | `cadence(): unknown;` | The billing cadence — overrides the `cadence` prop's rendering. |
| `tagline` | `tagline(): unknown;` | The positioning line — overrides the `tagline` prop's rendering. |
| `badgeLabel` | `badgeLabel(): unknown;` | The featured badge label — overrides the `badgeLabel` prop's rendering. |
| `feature` | `feature(props: { feature: string \| number; index: number }): unknown;` | One feature bullet — overrides the row body (the leading `Check` stays). |
| `default` | `default(): unknown;` | The CTA pinned to the bottom — pass a `Button`. |

## Exposed handle

`{ el: HTMLElement | null }` targets the inner Card or RovingFocusGroup DOM root, not its component instance. Read after mount; the handle is null before mount and after the child unmounts. It is suitable for native focus, measurement and scrolling; it does not expose child implementation methods.

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
