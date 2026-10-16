<script lang="ts">
import type { HTMLAttributes } from 'vue';
import type { SurfaceTone } from '../../../foundation/styles';
import type { ContainerLayoutProps } from '../containerLayout';
import type { NavbarElement, NavbarHeight, NavbarOrientation, NavbarVariant } from './Navbar.variants';

export interface NavbarProps {
  /**
   * The element: `header` (a banner landmark) or `div` (none). Default: `div` inside an `AppShellHeader`, which is
   * already the banner, and `header` elsewhere.
   */
  readonly as?: NavbarElement;
  /** Native attributes forwarded to the inner `ContainerLayout`; its `class` is merged last. */
  readonly containerAttrs?: HTMLAttributes;
  /** Convenience class for the inner `ContainerLayout`, merged after `containerAttrs.class`. */
  readonly containerClass?: HTMLAttributes['class'];
  /** The max-width of the inner centered `ContainerLayout`. Passthrough to `ContainerLayout.size`. Default `lg`. */
  readonly containerSize?: ContainerLayoutProps['size'];
  /** The band height. Default `md`. */
  readonly height?: NavbarHeight;
  /** The sticky pinning of the bar to the top of the scroll container. Default `false` (non-sticky). */
  readonly isSticky?: boolean;
  /** @deprecated Use `isSticky`; this alias is removed next release. */
  readonly sticky?: boolean;
  /**
   * The tinted background tone for the band — applies the shadow-less `subtle`
   * surface treatment. Omit for a transparent bar (relies on `hasBorder` / page bg).
   */
  readonly tone?: SurfaceTone;
  /** The bottom border under the bar. Default `true`. */
  readonly hasBorder?: boolean;
  /** @deprecated Use `hasBorder`; this alias is removed next release. */
  readonly bordered?: boolean;
  /** Which way the bar runs: a full-width top bar or a full-height side rail. Default `horizontal`. */
  readonly orientation?: NavbarOrientation;
  /** The surface: `solid`, `glass` or `transparent`. A `tone` overrides it. Default `solid`. */
  readonly variant?: NavbarVariant;
}
</script>

<script setup lang="ts">
import { computed, inject, provide, useAttrs, useSlots, useTemplateRef } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import ContainerLayout from '../containerLayout/ContainerLayout.vue';
import {
  NavbarElement as Element,
  NavbarOrientation as Orientation,
  NavbarSurfaceClass,
  navbarVariants,
} from './Navbar.variants';
import { bannerHostKey, navbarContextKey } from './NavbarContext';

/**
 * Renders a lightweight header band (`<header>`) with `start` / `center` / `end` slots
 * laid out in a row inside a centered `ContainerLayout`. The everyday "navbar +
 * centered content" need that `AppShell` (a 5-slot dashboard grid w/ sidebar)
 * overshoots. Non-sticky by default; pass `isSticky` to pin it.
 *
 * Inside an `AppShellHeader` it renders a plain row filling the bar: the host is the banner and owns the band's
 * height, border and surface, so the bar adds none of its own unless the props ask for them.
 */
defineOptions({ name: 'Navbar', inheritAttrs: false });

/** React's `start` / `center` / `end` / `children` ReactNode props are content regions — slots in Vue. */
defineSlots<{
  /** The leading slot — laid out at the start of the row (brand / logo / nav links). */
  start?(): unknown;
  /** The centre slot — laid out in the middle of the row (search / primary nav). */
  center?(): unknown;
  /** The trailing slot — laid out at the end of the row (actions / avatar / CTA). */
  end?(): unknown;
  /**
   * The raw row content — replaces the `start` / `center` / `end` slot layout when
   * provided. Use for fully custom bars.
   */
  default?(): unknown;
}>();

const props = withDefaults(defineProps<NavbarProps>(), {
  as: undefined,
  isSticky: undefined,
  sticky: undefined,
  hasBorder: undefined,
  bordered: undefined,
  orientation: Orientation.Horizontal,
  variant: undefined,
});

const isVertical = computed(() => props.orientation === Orientation.Vertical);

/** True inside a host that already is the banner — `AppShellHeader`. */
const isHosted = inject(bannerHostKey, false);

const tag = computed<Element>(() => props.as ?? (isHosted ? Element.Div : Element.Header));

provide(navbarContextKey, { orientation: computed(() => props.orientation) });

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLElement>('el');

const classes = computed(() =>
  cn(
    navbarVariants({
      orientation: props.orientation,
      sticky: props.isSticky ?? props.sticky ?? false,
      height: props.height,
    }),
    /* A hosted bar fills the host's row at the host's height. */
    isHosted && 'min-w-0 flex-1 self-stretch',
    isHosted && props.height === undefined && 'h-auto',
    (props.hasBorder ?? props.bordered ?? !isHosted) &&
      (isVertical.value ? 'border-e border-border' : 'border-b border-border'),
    props.tone
      ? surfaceVariants({ variant: 'subtle', tone: props.tone, radius: 'none' })
      : NavbarSurfaceClass[props.variant ?? (isHosted ? 'transparent' : 'solid')],
    attrs.class as string | undefined,
  ),
);

/** Push `end` to the trailing edge when there's no centre slot to absorb the slack. */
const endClasses = computed(() => cn('flex min-w-0 items-center gap-3', !slots.center && 'ml-auto'));

/** Inner-container classes with consumer spacing taking precedence. */
const containerClasses = computed(() =>
  cn('flex h-full items-center gap-3', props.containerAttrs?.class as string | undefined, props.containerClass),
);

/** Rail classes: a column from the brand at the top to the account at the foot, consumer spacing last. */
const railClasses = computed(() =>
  cn(
    'flex h-full min-h-0 flex-col items-stretch gap-3 p-3',
    props.containerAttrs?.class as string | undefined,
    props.containerClass,
  ),
);

/** Inner-container attributes except `class`, which is merged through `cn`. */
const containerRest = computed(() => {
  const { class: _class, ...others } = props.containerAttrs ?? {};
  return others;
});

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <component :is="tag" v-if="isVertical" ref="el" v-bind="rest" :class="classes">
    <div v-bind="containerRest" :class="railClasses">
      <slot v-if="$slots.default" />
      <template v-else>
        <div v-if="$slots.start" class="flex min-w-0 shrink-0 items-center gap-3">
          <slot name="start" />
        </div>
        <div v-if="$slots.center" class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <slot name="center" />
        </div>
        <div v-if="$slots.end" class="mt-auto flex min-w-0 shrink-0 items-center gap-3">
          <slot name="end" />
        </div>
      </template>
    </div>
  </component>
  <component :is="tag" v-else ref="el" v-bind="rest" :class="classes">
    <ContainerLayout v-bind="containerRest" :size="props.containerSize" :class="containerClasses">
      <slot v-if="$slots.default" />
      <template v-else>
        <div v-if="$slots.start" class="flex min-w-0 items-center gap-3">
          <slot name="start" />
        </div>
        <div v-if="$slots.center" class="flex min-w-0 flex-1 items-center justify-center gap-3">
          <slot name="center" />
        </div>
        <div v-if="$slots.end" :class="endClasses">
          <slot name="end" />
        </div>
      </template>
    </ContainerLayout>
  </component>
</template>
