<script lang="ts">
import type { ButtonHTMLAttributes, VNodeChild } from 'vue';
import type { OverlayPosition } from '../../../foundation/styles';

/* Native button attributes stay in attribute fallthrough rather than becoming runtime props. */
export interface BackToTopButtonProps extends /* @vue-ignore */ ButtonHTMLAttributes {
  /** The scroll distance (px) before the button appears. Default 400. */
  readonly threshold?: number;

  /** The scrollable element to scope to. Defaults to the window. */
  readonly scrollContainer?: HTMLElement | null;

  /** The anchor position on the viewport. Default `bottom-right`. */
  readonly position?: OverlayPosition;

  /** The visible label. Omit for icon-only. Prefer the `label` named slot. */
  readonly label?: VNodeChild;

  /** The button type. Default `ButtonType.Button`. */
  readonly type?: ButtonType;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, defineComponent, shallowRef, useAttrs, useTemplateRef, watchPostEffect } from 'vue';
import { ArrowUp } from 'lucide-vue-next';
import type { ClassValue } from 'clsx';
import { AriaAttribute, ButtonType } from '../../../foundation/dom';
import { cn, OverlayPosition as OverlayPositionValue } from '../../../foundation/styles';
import { Icon } from '../../../foundation/icons';

const locale = useLocale();

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a floating button that appears past a scroll threshold and returns the page to the top. */
defineOptions({ name: 'BackToTopButton', inheritAttrs: false });

const props = withDefaults(defineProps<BackToTopButtonProps>(), {
  threshold: 400,
  position: OverlayPositionValue.BottomRight,
  type: ButtonType.Button,
  scrollContainer: null,
  /* `VNodeChild` includes `boolean`, so Vue's boolean casting turns an absent node-valued prop
     into `false` rather than `undefined` — which reads as "supplied" at every `!== undefined`
     check. An explicit `undefined` default suppresses the cast. */
  label: undefined,
});

const slots = defineSlots<{
  /** The visible label beside the arrow. Falls back to the `label` prop, then to icon-only. */
  label?(): unknown;
}>();

const attrs = useAttrs();

const PositionClasses: Record<OverlayPosition, string> = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
};

/* Stable render-only wrapper for the node-valued `label` prop, so it can render as the fallback of
   its named-slot twin. */
const LabelProp = defineComponent({ render: () => props.label });

const hasLabel = computed(() => props.label !== undefined || slots.label !== undefined);

const visible = shallowRef(false);

/* `watchPostEffect` is the `useEffect` counterpart: it re-subscribes whenever `threshold` or
   `scrollContainer` changes, and reads once on attach. */
watchPostEffect((onCleanup) => {
  if (typeof window === 'undefined') return;
  const element: HTMLElement | Window = props.scrollContainer ?? window;
  const read = (): void => {
    const y = 'scrollY' in element ? (element as Window).scrollY : (element as HTMLElement).scrollTop;
    visible.value = y >= props.threshold;
  };
  read();
  const target = element as EventTarget;
  target.addEventListener('scroll', read, { passive: true });
  onCleanup(() => target.removeEventListener('scroll', read));
});

/* `aria-label` is read off `attrs`, not `props`: Vue camelizes declared prop keys, so a declared
   `'aria-label'` would arrive as `props.ariaLabel` and never render. It is stripped from the
   forwarded attrs and re-bound below, so the resolved value is the one that lands. */
const ariaLabel = computed(
  () =>
    (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('BackToTopButton.label', undefined, 'Back to top'),
);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'fixed z-banner inline-flex items-center justify-center gap-2 rounded-full bg-card text-card-foreground shadow-lg ring-1 ring-border transition-all hover:shadow-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    hasLabel.value ? 'h-11 px-4 text-sm font-medium' : 'h-11 w-11',
    PositionClasses[props.position],
    attrs.class as ClassValue,
  ),
);

/* Chained after the consumer's own click (attribute fallthrough puts theirs first) and skipped
   when they called `preventDefault()` — the original's `onClick?.(e); if (e.defaultPrevented) return`. */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const target = props.scrollContainer ?? window;
  if ('scrollTo' in target) {
    target.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

const root = useTemplateRef<HTMLButtonElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <!-- Floating button revealed past `threshold` scroll — smooth-scrolls to top. -->
  <button
    v-if="visible"
    ref="root"
    :type="type"
    :aria-label="ariaLabel"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @click="handleClick"
  >
    <Icon :icon="ArrowUp" :size="16" />
    <slot name="label"><LabelProp v-if="label !== undefined" /></slot>
  </button>
</template>
