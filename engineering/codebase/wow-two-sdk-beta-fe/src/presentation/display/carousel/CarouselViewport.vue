<script lang="ts">
/**
 * `aria-label` stays a FALLTHROUGH attr — declaring a hyphenated prop name would have Vue camelize it to
 * `ariaLabel`, so the `'Carousel'` default below would never apply.
 */
export interface CarouselViewportProps {
  /**
   * Lets a horizontal touch or pen swipe step one slide. Default `true`; turn it off when a slide owns horizontal
   * drags itself, such as a map.
   */
  readonly canSwipe?: boolean;
}

/** @internal The horizontal travel, in CSS pixels, that turns a touch drag into a swipe — `LightboxModal`'s step. */
const SwipeDistance = 48;

/** @internal Presses that start on these keep their own horizontal drag — a range, a caret, a selection. */
const SwipeExempt = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, onBeforeUnmount, useAttrs, useTemplateRef } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useCarouselContext } from './CarouselContext';

const locale = useLocale();

/**
 * Renders the clipping frame and owns the arrow-key and swipe seams; React shipped it as `Carousel.Viewport`.
 *
 * The swipe never captures the pointer: a press on a link or button inside a slide stays that element's press, so a tap
 * still clicks it. Only touch and pen swipe — a mouse has the arrows and the keys, and a mouse drag selects text.
 */
defineOptions({ name: 'CarouselViewport', inheritAttrs: false });

/** The `CarouselSlides` content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<CarouselViewportProps>(), { canSwipe: true });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const carousel = useCarouselContext();

/** A swipe needs somewhere to go; until then the frame keeps the page's own touch handling. */
const isSwipeable = computed(() => props.canSwipe && carousel.count > 1);

/** The accessible label for the viewport. Default `'Carousel'`. */
const ariaLabel = computed(
  () => (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('CarouselViewport.label', undefined, 'Carousel'),
);

/**
 * Runs after a consumer's own `keydown` — `rest` sits ahead of this binding in
 * the template, which is what makes the `defaultPrevented` check meaningful, the
 * same way React's explicit `onKeyDown?.(e)` call did.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || event.target !== event.currentTarget) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    carousel.prev();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    carousel.next();
  }
}

/** Where the press began; `null` between gestures and after a second finger lands. */
let swipe: { readonly x: number; readonly y: number; readonly pointerId: number } | null = null;
/** Set by a swipe's release, so the click a pen fires on the element it lifted from does not also activate it. */
let isClickSwallowed = false;
let swallowTimer: number | undefined;

/**
 * Records the press without capturing it — capture would retarget the release to this frame, and the browser then
 * fires the click here rather than on the link or button that was pressed.
 */
function onPointerdown(event: PointerEvent): void {
  if (swipe !== null && swipe.pointerId !== event.pointerId) {
    swipe = null; // A second finger: a pinch, not a swipe.
    return;
  }
  const target = event.target instanceof Element ? event.target : null;
  if (
    event.defaultPrevented ||
    !isSwipeable.value ||
    event.pointerType === 'mouse' ||
    !event.isPrimary ||
    target?.closest(SwipeExempt)
  )
    return;
  swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
}

/** Steps one slide when the release travelled far enough, and further across than down. */
function onPointerup(event: PointerEvent): void {
  const start = swipe;
  swipe = null;
  if (event.defaultPrevented || start === null || start.pointerId !== event.pointerId) return;
  const travel = event.clientX - start.x;
  if (Math.abs(travel) < SwipeDistance || Math.abs(travel) < Math.abs(event.clientY - start.y)) return;
  if (travel < 0) carousel.next();
  else carousel.prev();
  isClickSwallowed = true;
  window.clearTimeout(swallowTimer);
  /* The release's own click arrives in the same task; anything later is a new activation. */
  swallowTimer = window.setTimeout(() => {
    isClickSwallowed = false;
  });
}

/** The browser took the pointer — a vertical scroll under `touch-action: pan-y`, or a lost contact. */
function onPointercancel(): void {
  swipe = null;
}

function onClickCapture(event: MouseEvent): void {
  if (!isClickSwallowed) return;
  isClickSwallowed = false;
  event.preventDefault();
  event.stopPropagation();
}

onBeforeUnmount(() => {
  swipe = null;
  if (swallowTimer !== undefined) window.clearTimeout(swallowTimer);
});

/* `pan-y` leaves vertical page scroll and pinch zoom to the browser and hands the horizontal stroke to the swipe;
   without it the browser claims the stroke and cancels the pointer. */
const classes = computed(() =>
  cn(
    'relative overflow-hidden rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    isSwipeable.value && 'touch-pan-y touch-pinch-zoom',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class` and `aria-label`, both re-applied explicitly above. */
const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _ariaLabel, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    role="group"
    :aria-roledescription="locale.t('CarouselViewport.carousel', undefined, 'carousel')"
    :aria-label="ariaLabel"
    :tabindex="0"
    v-bind="rest"
    :class="classes"
    @keydown="onKeydown"
    @pointerdown="onPointerdown"
    @pointerup="onPointerup"
    @pointercancel="onPointercancel"
    @click.capture="onClickCapture"
  >
    <slot />
  </div>
</template>
