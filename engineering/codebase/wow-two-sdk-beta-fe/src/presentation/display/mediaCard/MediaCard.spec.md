# MediaCard

Renders an image-first card: the media fills the card at a fixed ratio, and the text sits on a panel at the bottom
where a blur fades upward into the image.

Source: [MediaCard.vue](MediaCard.vue).

Public import: `import { MediaCard } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- The card holds `ratio` (width ÷ height) at any column width, so a grid stepping from 4 to 2 columns scales the image
  instead of cropping it to a strip. A direct `img` or `video` in `media` fills the card with `object-cover`; any other
  direct child (a `Carousel`) is sized to the card.
- With no `media` slot the card shows a soft tile (`primary-soft` → `muted`) with the `fallback` slot centred on it.
- The text panel is `panelHeight` tall (default `8.5rem`) and anchored to the bottom, so the cards of a row line up;
  content beyond it is cut. It is a dark stage in both themes: white text, and the `dark` class, so tokens inside it —
  a `MetaInlineItem` tone, a plain `Badge` — resolve to their dark values.
- Under the panel a blur layer covers the lower 60 % of the card over a dark gradient (`black/80` → transparent),
  masked `linear-gradient(to top, black 50%, transparent)`, so the blur fades out upward rather than ending in a strip.
- The media zooms to 105 % while the card is hovered; under `prefers-reduced-motion: reduce` it stays still. The zoom
  and `isDimmed`'s grayscale act on the `img` and `video` elements, never on the media layer, so media controls keep
  their stacking.
- `href` makes the whole text panel one link (`data-card-link`, the panel's text as its name) whose pseudo-element
  covers the card: a click anywhere on the media follows it. An address with a scheme other than http(s), `mailto:` or
  `tel:` renders no link.
- For an in-app route, omit `href` and put a [`CardLink`](../card/CardLink.spec.md) around the title in the default
  slot, `as-child` around an `AppLink` or `RouterLink`: it stretches over the card the same way, named by the title.
- The card draws the focus ring around itself while its link has `:focus-visible`, and borders in `primary/40` on hover.
- The top slots sit above the link (`z-20`): `topStart`, `topCenter` and `topEnd` take their own clicks, and a click on
  them never follows the link. A control inside `media`, such as a carousel arrow, joins them with `z-20`.
- Reading and tab order: the panel (the link) first, then the media and its controls, then the top slots.
- Automatic attribute inheritance is disabled; attributes, `class` and `style` reach the root, and a `style` wins over
  the ratio.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `ratio` | `number` | no | `4 / 5` | The card's width divided by its height. |
| `href` | `string` | no | — | The address the card opens; the panel becomes a link stretched over the card. |
| `isDimmed` | `boolean` | no | `false` | Draws the media in grayscale (`data-dimmed`) — a subject that is gone or inactive. |
| `panelHeight` | `string` | no | `'8.5rem'` | The text panel's fixed height, any CSS length. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `media` | `media?(): unknown` | The media filling the card — an `img`, a `video` or a `Carousel`. |
| `fallback` | `fallback?(): unknown` | The content of the soft tile shown with no `media`, such as the subject's icon. |
| `default` | `default?(): unknown` | The text panel — pills, the title, a meta line. |
| `topStart` | `topStart?(): unknown` | The controls at the top start corner. |
| `topCenter` | `topCenter?(): unknown` | The content at the top centre, such as an image indicator. |
| `topEnd` | `topEnd?(): unknown` | The controls at the top end corner, such as an open-original button. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

A post card: a carousel whose arrows sit above the link, a glass pill around `DotsIndicator` at the top centre, an
open-original button top end, and a meta line on the panel:

```vue
<MediaCard :href="`/posts/${post.id}`" :is-dimmed="post.isGone">
  <template #media>
    <Carousel v-model:index="index" can-loop>
      <CarouselViewport class="size-full rounded-none">
        <CarouselSlides class="size-full">
          <CarouselSlide v-for="src in post.images" :key="src">
            <img :src="src" alt="" class="size-full object-cover" />
          </CarouselSlide>
        </CarouselSlides>
      </CarouselViewport>
      <CarouselPrev class="z-20" />
      <CarouselNext class="z-20" />
    </Carousel>
  </template>
  <template #fallback><Icon :icon="ImageOff" :size="28" /></template>
  <template #topCenter>
    <span class="rounded-full bg-black/30 px-2 py-1.5 text-white backdrop-blur-md">
      <DotsIndicator :count="post.images.length" :index="index" />
    </span>
  </template>
  <template #topEnd>
    <Button variant="glass" shape="circle" size="sm" as-child>
      <a :href="post.url" target="_blank" rel="noopener noreferrer" aria-label="Open the original">
        <Icon :icon="ArrowUpRight" />
      </a>
    </Button>
  </template>
  <span class="line-clamp-2 text-[15px] font-semibold leading-snug">{{ post.title }}</span>
  <MetaInlineText gap="3" class="text-[13px] text-white/75">
    <MetaInlineItem tone="success" label="21 to 23 November, ongoing">
      <template #icon><Icon :icon="CalendarRange" :size="14" /></template>
      21–23 Nov
    </MetaInlineItem>
    <MetaInlineItem label="posted 3 days ago">
      <template #icon><Icon :icon="History" :size="14" /></template>
      3 days
    </MetaInlineItem>
  </MetaInlineText>
</MediaCard>
```

An in-app route, the title as the link:

```vue
<MediaCard>
  <template #media><img :src="listing.cover" alt="" /></template>
  <CardLink as-child class="line-clamp-2 font-semibold">
    <AppLink :to="{ name: 'listing', params: { id: listing.id } }">{{ listing.title }}</AppLink>
  </CardLink>
</MediaCard>
```

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused tests: [MediaCard.dom.test.ts](../../../../tests/unit/presentation/display/MediaCard.dom.test.ts) covers the
  link, the top slots outside it, the fallback, the ratio and panel styles and the dimmed media;
  [MediaCard.browser.test.ts](../../../../tests/unit/presentation/display/MediaCard.browser.test.ts) hit-tests a click
  on the media and on a `topEnd` button, measures the ratio in 1, 2 and 4 columns, and renders the fixture in light and
  dark.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
