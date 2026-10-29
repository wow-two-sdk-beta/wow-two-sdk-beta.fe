# CardLink

Renders a card's one link, stretched over the whole `Card`, so a click anywhere on the card opens it.

Source: [CardLink.vue](CardLink.vue).

Public import: `import { CardLink } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- An `a` (`href`) carrying `data-card-link`, whose `::after` covers the nearest positioned ancestor; with `asChild` the
  same attributes and classes merge onto the single child — a `RouterLink` or `AppLink`.
- A `Card` that holds a `CardLink` turns `relative`, so the hit area is the card, and draws the focus ring around
  itself while the link has `:focus-visible`; the link draws none of its own.
- The link text is the card's title, so the reading order keeps one named link instead of a card-sized one.
- Controls that must stay clickable inside the card — menus, pills, buttons — sit above it with `relative z-10`.
- Automatic attribute inheritance is disabled; attributes and `class` reach the link.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `href` | `string` | no | — | The address the card opens; ignored with `asChild`. |
| `asChild` | `boolean` | no | `false` | Merges onto the single slot child instead of rendering an `a`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `default` | `default(): unknown` | The link text, or the link itself with `asChild`. |

## Exposed handle

No explicit exposed handle.

```vue
<Card padding="lg">
  <CardLink as-child><RouterLink :to="`/products/${product.slug}`">{{ product.name }}</RouterLink></CardLink>
  <ProductMenu class="relative z-10" />
</Card>
```

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused test references: [Card.dom.test.ts](../../../../tests/unit/presentation/display/Card.dom.test.ts).
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
