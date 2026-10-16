<script lang="ts">
/** The imperative surface exposed on a `MessageGroup` template ref. */
export interface MessageGroupHandle {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  isAtBottom: () => boolean;
}

export interface MessageGroupProps {
  /** The sticky auto-scroll — scrolls to bottom when children change *and* the viewer is near it. Default true. */
  readonly isSticky?: boolean;

  /** The threshold (px) considered "at bottom" for stickiness. Default 32. */
  readonly bottomThreshold?: number;

  /** The floating "jump to bottom" button's visibility when scrolled away. Default true. */
  readonly hasJumpToBottom?: boolean;

  /** The reversed render order (newest at top). v1 keeps natural top→bottom. */
  readonly isReversed?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, useAttrs, useTemplateRef } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';

const locale = useLocale();

/**
 * Renders a scrolling message viewport with sticky auto-scroll and a jump-to-latest affordance.
 *
 * Messages stay in the default slot — `MessageGroup` owns the viewport, not the rows.
 *
 * React's `header` / `footer` were structural `ReactNode` props with no string form worth keeping; they are slots
 * only.
 */
defineOptions({ name: 'MessageGroup', inheritAttrs: false });

defineSlots<{
  /** The region above the message stream (e.g. "load older"). */
  header(): unknown;

  /** The message rows — React's required `children`. */
  default(): unknown;

  /** The region below the message stream (e.g. typing indicator). */
  footer(): unknown;
}>();

const props = withDefaults(defineProps<MessageGroupProps>(), {
  isSticky: true,
  bottomThreshold: 32,
  hasJumpToBottom: true,
  isReversed: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const scroller = useTemplateRef<HTMLDivElement>('scroller');

/**
 * Near-bottom state recorded *before* a new message commits (in the scroll
 * handler). Measuring inside the post-update hook would see the just-committed
 * message, so anything taller than `bottomThreshold` would defeat stickiness.
 * Plain `let`, not a `ref` — nothing renders off it, exactly like React's ref.
 */
let nearBottom = true;

const atBottom = ref(true);

const isNearBottom = (): boolean => {
  const node = scroller.value;
  if (!node) return true;
  return node.scrollHeight - node.clientHeight - node.scrollTop <= props.bottomThreshold;
};

const scrollToBottom = (behavior: ScrollBehavior = 'smooth'): void => {
  const node = scroller.value;
  if (!node) return;
  node.scrollTo({ top: node.scrollHeight, behavior });
};

const onScroll = (): void => {
  nearBottom = isNearBottom();
  atBottom.value = nearBottom;
};

/**
 * React ran the sticky scroll in a layout effect keyed on `children`, *before*
 * the effect that attached the listener — so the first paint lands at the
 * bottom while `nearBottom` is still its initial `true`. The mount order below
 * preserves that: scroll first, then attach and take the first measurement.
 */
onMounted(() => {
  if (props.isSticky && nearBottom) scrollToBottom('auto');
  const node = scroller.value;
  if (!node) return;
  node.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onBeforeUnmount(() => {
  scroller.value?.removeEventListener('scroll', onScroll);
});

/**
 * Stands in for React's `useLayoutEffect(…, [children])`. A slot's content is
 * not a reactive dependency Vue can watch, but any new message re-renders this
 * component, and `onUpdated` is the hook that fires after that commit.
 */
onUpdated(() => {
  if (props.isSticky && nearBottom) scrollToBottom('auto');
});

const classes = computed(() => cn('relative flex h-full min-h-0 flex-col', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** React's `useImperativeHandle` surface (`MessageGroupHandle`), plus the root element. */
defineExpose({ el, scrollToBottom, isAtBottom: isNearBottom });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes">
    <div v-if="$slots.header" class="shrink-0"><slot name="header" /></div>
    <div
      ref="scroller"
      class="flex-1 min-h-0 overflow-y-auto px-3 py-3"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div class="flex flex-col gap-2"><slot /></div>
    </div>
    <div v-if="$slots.footer" class="shrink-0 border-t border-border px-3 py-2">
      <slot name="footer" />
    </div>
    <button
      v-if="props.hasJumpToBottom && !atBottom"
      type="button"
      :aria-label="locale.t('MessageGroup.jumpToLatest', undefined, 'Jump to latest')"
      class="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      @click="scrollToBottom('smooth')"
    >
      <ChevronDown class="h-4 w-4" />
    </button>
  </div>
</template>
