# MetaInlineItem

Renders one item of a meta line behind its icon — an event's dates, a post's age — with an optional fuller phrase for
screen readers and a tone.

Source: [MetaInlineItem.vue](MetaInlineItem.vue).

Public import: `import { MetaInlineItem, MetaInlineItemTone } from '@wow-two-beta/fe/presentation/display';`.

## Contract

- A `span` (`inline-flex`, `gap-1`): the `icon` slot, then the visible text. The icon is decorative and hidden from
  assistive technology (`aria-hidden`); the item's meaning is in its text or its `label`.
- `label` is the phrase assistive technology reads as the item's text — `posted 3 days ago` behind a visible
  `3 days`. It renders visually hidden, and the visible text turns `aria-hidden`, so the item is read once. Without
  `label` the visible text is read.
- `tone` colours the icon and the text and stamps `data-tone`: `default` keeps the surrounding colour, `success` is
  `text-success-soft-foreground` (a live, positive state), `muted` is `text-muted-foreground` (a past or inactive
  one). Both tokens hold AA on page surfaces and, through the `dark` class, on a `MediaCard` panel. A tone that carries
  meaning repeats it in `label` (`ongoing`, `finished`), since colour alone does not reach every reader.
- The item keeps one line. It may shrink in its row (`min-w-0`): the text cuts with an ellipsis and the icon stays at
  its size; add `shrink-0` to an item that must stay whole.
- It lays out inside any inline row; `MetaInlineText` is the usual one, the items in its default slot.
- Automatic attribute inheritance is disabled; attributes and `class` reach the root.

## Props

| Prop | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | `string` | no | — | The phrase assistive technology reads in place of the visible text. |
| `tone` | `MetaInlineItemTone` | no | `'default'` | The colour of the icon and text: `default` · `success` · `muted`. |

## Emits

None declared.

## Slots

| Slot | Signature | Meaning |
|---|---|---|
| `icon` | `icon?(): unknown` | The leading icon; decorative. |
| `default` | `default?(): unknown` | The visible text, hidden from assistive technology when `label` is set. |

## Exposed handle

`{ el }`. Read this through a component template ref after mount; the referenced DOM node may be absent while unmounted.

```vue
<MetaInlineText gap="3" class="text-[13px] text-muted-foreground">
  <MetaInlineItem :tone="MetaInlineItemTone.Success" label="21 to 23 November, ongoing">
    <template #icon><Icon :icon="CalendarRange" :size="14" /></template>
    21–23 Nov
  </MetaInlineItem>
  <MetaInlineItem label="posted 3 days ago" class="shrink-0">
    <template #icon><Icon :icon="History" :size="14" /></template>
    3 days
  </MetaInlineItem>
</MetaInlineText>
```

## Verification

- Public render fixture: [DisplayExamples.ts](../../../../apps/playground/src/gallery/fixtures/DisplayExamples.ts). This covers render/SSR compatibility, not all interaction behavior.
- Focused tests: [MetaInlineItem.dom.test.ts](../../../../tests/unit/presentation/display/MetaInlineItem.dom.test.ts)
  covers the text assistive technology reads, the hidden icon and each tone's class.
- Required follow-through for changes: verify the affected state, keyboard, focus, composition and cleanup paths; the existence of this specification is not a passing-test claim.
