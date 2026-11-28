<script lang="ts">
/** Defines props for the image-first card whose text sits on a faded glass panel over the media. */
export interface MediaCardProps {
  /** The card's width divided by its height, held at any column width. Default `4 / 5`. */
  readonly ratio?: number;

  /**
   * The address the card opens: the text panel becomes one link stretched over the whole card. For an in-app route,
   * omit it and put a `CardLink` (`as-child` around an `AppLink`) around the title in the default slot instead.
   */
  readonly href?: string;

  /** Draws the media in grayscale — a subject that is gone or inactive. Default `false`. */
  readonly isDimmed?: boolean;

  /**
   * The most height the text panel may take, foot padding included, any CSS length; a percentage is a share of the
   * card. Text beyond it is cut. Default `8.5rem`.
   */
  readonly panelHeight?: string;
}
</script>

<script setup lang="ts">
import { computed, normalizeStyle, useAttrs, useTemplateRef } from 'vue';
import { UrlExtensions } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import CardLink from '../card/CardLink.vue';

/**
 * Renders an image-first card: the media fills the card at a fixed ratio, and the text sits on a panel at the
 * bottom. The panel carries its own blur, which reaches full strength at the text's top edge and fades out over the
 * `2rem` above it. One link spans the whole card; the controls in the top slots, and media controls raised with
 * `z-20`, sit above it.
 */
defineOptions({ name: 'MediaCard', inheritAttrs: false });

defineSlots<{
  /** The media filling the card — an `img`, a `video` or a `Carousel`. */
  media?(): unknown;
  /** The content of the soft tile shown when there is no media, such as the subject's icon. */
  fallback?(): unknown;
  /** The text panel — pills, the title, a meta line. */
  default?(): unknown;
  /** The controls at the top start corner. */
  topStart?(): unknown;
  /** The content at the top centre, such as a glass pill around a `DotsIndicator`. */
  topCenter?(): unknown;
  /** The controls at the top end corner, such as an open-original button. */
  topEnd?(): unknown;
}>();

const props = withDefaults(defineProps<MediaCardProps>(), {
  ratio: 4 / 5,
  href: undefined,
  isDimmed: false,
  panelHeight: '8.5rem',
});

/* The card draws the focus ring while its link is focused; the panel's link spans the whole card, see `PanelClass`. */
const RootClass =
  'group/media-card relative isolate flex min-w-0 flex-col justify-end overflow-hidden rounded-2xl border ' +
  'border-border bg-muted transition-colors has-[[data-card-link]]:hover:border-primary/40 has-[[data-card-link]]:active:border-primary/40 ' +
  'has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-2 ' +
  'has-[[data-card-link]:focus-visible]:outline-ring';

/*
 * Zoom and grayscale act on the images, never on this layer: a transform or a filter here would trap a carousel's
 * raised arrows under the link.
 */
const MediaClass =
  'absolute inset-0 *:size-full [&>img]:object-cover [&>video]:object-cover ' +
  'motion-safe:[&_img]:transition-transform motion-safe:[&_img]:duration-500 ' +
  'motion-safe:[&_video]:transition-transform motion-safe:[&_video]:duration-500 ' +
  'motion-safe:group-hover/media-card:[&_img]:scale-105 motion-safe:group-hover/media-card:[&_video]:scale-105';

const DimmedMediaClass = '[&_img]:grayscale [&_video]:grayscale';

const FallbackClass =
  'absolute inset-0 grid place-items-center bg-gradient-to-br from-primary-soft to-muted text-muted-foreground';

/*
 * The blur belongs to the content, so it is a child of the panel: its top sits one feather (`2rem`) above the text's
 * top edge, it reaches the card's foot, and the mask holds it at full strength until that last `2rem`. It stays
 * behind the text (`-z-10` inside the panel's own stacking context) and above the media, which it blurs.
 */
const BlurClass =
  'pointer-events-none absolute inset-x-0 -top-8 bottom-0 -z-10 bg-gradient-to-t from-black/80 via-black/45 ' +
  'to-transparent backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_top,black_calc(100%_-_2rem),transparent)] ' +
  '[mask-image:linear-gradient(to_top,black_calc(100%_-_2rem),transparent)]';

/*
 * A dark stage in both themes: `dark` resolves the tokens inside it, such as a meta item tone, to dark values. It is
 * positioned to hold the blur, which would confine a link's stretched pseudo-element to the panel, so the pseudo-
 * element of any `data-card-link` inside — the `href` link or a slotted `CardLink` — reaches up over the whole card
 * instead (the card clips it). The panel itself never clips: the blur's feather rises above it. It carries the
 * `panelHeight` cap: as the card's child, a percentage resolves against the card, whose height `aspect-ratio` fixes.
 */
const PanelClass =
  'dark relative z-10 flex min-w-0 shrink-0 flex-col justify-end px-4 pb-4 text-white ' +
  '[&_[data-card-link]::after]:inset-x-0 [&_[data-card-link]::after]:-top-[100rem] ' +
  '[&_[data-card-link]::after]:bottom-0';

/*
 * Holds the text and shrinks only when the panel meets its cap, cutting what exceeds it at the top; the panel above
 * stays unclipped for the blur.
 */
const TextClass = 'flex min-h-0 min-w-0 flex-col justify-end gap-2 overflow-hidden';

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/** The link target, kept only for a navigation scheme — a `javascript:` address renders no link. */
const safeHref = computed(() => UrlExtensions.safeNavigation(props.href));

const classes = computed(() => cn(RootClass, attrs.class as string | undefined));

/*
 * The cap sits on the panel, the card's child, so a percentage is a share of the card, never of the content-sized
 * panel. The foot padding sits inside the cap; the blur's feather does not.
 */
const panelStyles = computed(() => ({ maxHeight: props.panelHeight }));

/** `normalizeStyle` merges left → right, so a caller's `style` lands last and wins. */
const styles = computed(() => normalizeStyle([{ aspectRatio: `${props.ratio}` }, attrs.style]));

const mediaClasses = computed(() => cn(MediaClass, props.isDimmed && DimmedMediaClass));

const fallbackClasses = computed(() => cn(FallbackClass, props.isDimmed && 'grayscale'));

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" :data-dimmed="props.isDimmed || undefined" v-bind="rest" :class="classes" :style="styles">
    <div data-media-card-panel :class="PanelClass" :style="panelStyles">
      <div :class="BlurClass" aria-hidden="true"></div>
      <div data-media-card-text :class="TextClass">
        <CardLink v-if="safeHref" :href="safeHref" class="flex min-w-0 flex-col justify-end gap-2"><slot /></CardLink>
        <slot v-else />
      </div>
    </div>
    <div v-if="$slots.media" data-media-card-media :class="mediaClasses"><slot name="media" /></div>
    <div v-else data-media-card-fallback :class="fallbackClasses"><slot name="fallback" /></div>
    <div
      v-if="$slots.topStart"
      data-media-card-top="start"
      class="absolute start-3 top-3 z-20 flex items-center gap-1.5"
    >
      <slot name="topStart" />
    </div>
    <div
      v-if="$slots.topCenter"
      data-media-card-top="center"
      class="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center"
    >
      <slot name="topCenter" />
    </div>
    <div v-if="$slots.topEnd" data-media-card-top="end" class="absolute end-3 top-3 z-20 flex items-center gap-1.5">
      <slot name="topEnd" />
    </div>
  </div>
</template>
