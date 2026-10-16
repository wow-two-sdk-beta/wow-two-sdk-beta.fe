<script lang="ts">
import type { AbsolutePosition, SizeValue } from '../../../foundation/styles';
import type { PresenceAnimationDurationProp } from '../../../foundation/animation';
import { AnchorLayoutTransition } from './AnchorLayout.variants';

/* Re-exported for ergonomic consumer imports — same shape as the shared types. */
export type OverlayPosition = AbsolutePosition;

/** Defines the visibility trigger of an `AnchorLayout` while mounted. */
export const AnchorLayoutAppearOn = {
  /** Refers to an always-visible overlay. */
  Always: 'always',
  /** Refers to reveal-on-hover (and focus-within). */
  Hover: 'hover',
  /** Refers to reveal-on-focus-within. */
  FocusWithin: 'focus-within',
} as const;

export type AnchorLayoutAppearOn = (typeof AnchorLayoutAppearOn)[keyof typeof AnchorLayoutAppearOn];

export { AnchorLayoutTransition };
export type AnchorLayoutDuration = PresenceAnimationDurationProp;

/**
 * The prop surface of `AnchorLayout`.
 *
 * `class` / `style` are attrs, not props, and so are absent here. `AnchorLayout`
 * consumes only those two attrs — no other attribute is forwarded, by design
 * (`AnchorLayout.standard.md` rule 10: it never sets `role` / `aria-*`; the child
 * carries its own semantics).
 */
export interface AnchorLayoutProps {
  /** The anchor location — preset corner/edge/center, or raw inset object. Default 'top-right'. */
  readonly position?: OverlayPosition;

  /** The spacing from edge for preset positions. Default '0.5rem'. Ignored for custom inset object. */
  readonly inset?: SizeValue;

  /** The z-index. Default 10. */
  readonly zIndex?: number | string;

  /** The visibility trigger while mounted. Default 'always'. Hover/focus-within modes need parent `class="group"`. */
  readonly appearOn?: AnchorLayoutAppearOn;

  /** The presence — controls mount/unmount with an exit transition, deferring unmount until transitionend. */
  readonly isOpen?: boolean;

  /** The animation effect for show/hide. Defaults to 'fade' if any visibility gating is active, else 'none'. */
  readonly transition?: AnchorLayoutTransition;

  /** The duration in ms. Number = symmetric; object = asymmetric enter/exit. Default 200. */
  readonly transitionDuration?: AnchorLayoutDuration;

  /** The CSS timing function. Default 'ease-out'. */
  readonly transitionEasing?: string;

  /** The single-child merge via `Primitive` (no extra wrapper div). Default true. */
  readonly asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, normalizeStyle, useAttrs } from 'vue';
import {
  cn,
  CssExtensions,
  type AbsoluteInsetOverrides,
  type AbsolutePositionPreset,
} from '../../../foundation/styles';
import { TransitionExtensions } from '../../../foundation/animation';
import { Presence, Primitive } from '../../../foundation/primitives';
import { overlayVariants, AnchorLayoutVisibilityMode } from './AnchorLayout.variants';

/**
 * Renders a positioned overlay anchored to its nearest positioned ancestor — for image-corner
 * controls, badges, hover-revealed actions, and conditionally mounted floating elements.
 */
defineOptions({ name: 'AnchorLayout', inheritAttrs: false });

/** The content — a single element when `asChild` (default), or arbitrary content otherwise. */
defineSlots<{ default(): unknown }>();

/**
 * `isOpen: undefined` is load-bearing, not noise: Vue casts an absent `Boolean`
 * prop to `false` unless the declaration *owns* a `default` key, which would make
 * `isOpen !== undefined` always true and force every overlay into presence mode.
 * Declaring the default as `undefined` keeps the three states — absent / `true` / `false`.
 */
const props = withDefaults(defineProps<AnchorLayoutProps>(), {
  position: 'top-right',
  zIndex: 10,
  appearOn: AnchorLayoutAppearOn.Always,
  asChild: true,
  isOpen: undefined,
  transition: undefined,
  transitionDuration: undefined,
  transitionEasing: undefined,
  inset: undefined,
});

const attrs = useAttrs();

const isPresenceMode = computed(() => props.isOpen !== undefined);
const isCustomPosition = computed(() => typeof props.position === 'object' && props.position !== null);

const effectiveTransition = computed<AnchorLayoutTransition>(
  () =>
    props.transition ??
    (isPresenceMode.value || props.appearOn !== AnchorLayoutAppearOn.Always
      ? AnchorLayoutTransition.Fade
      : AnchorLayoutTransition.None),
);

const visibilityMode = computed<AnchorLayoutVisibilityMode>(() =>
  isPresenceMode.value
    ? AnchorLayoutVisibilityMode.Presence
    : props.appearOn === AnchorLayoutAppearOn.Hover
      ? AnchorLayoutVisibilityMode.Hover
      : props.appearOn === AnchorLayoutAppearOn.FocusWithin
        ? AnchorLayoutVisibilityMode.FocusWithin
        : AnchorLayoutVisibilityMode.Always,
);

const classes = computed(() =>
  cn(
    overlayVariants({
      position: isCustomPosition.value ? 'custom' : (props.position as AbsolutePositionPreset),
      visibilityMode: visibilityMode.value,
      transition: effectiveTransition.value,
    }),
    attrs.class as string | undefined,
  ),
);

/**
 * A caller's `style` is normalized FIRST so the computed declarations below win.
 */
const inlineStyle = computed(() => {
  const { enter, exit } = TransitionExtensions.resolveDuration(props.transitionDuration);

  const own: Record<string, string | number> = {
    zIndex: props.zIndex,
    // CSS vars consumed by tailwind variants — exit is the baseline
    // transition-duration; enter overrides it on hover / focus-within / isOpen.
    '--ui-overlay-enter': `${enter}ms`,
    '--ui-overlay-exit': `${exit}ms`,
  };

  if (props.inset !== undefined) {
    own['--ui-overlay-inset'] = CssExtensions.toCss(props.inset);
  }

  if (props.transitionEasing) {
    own.transitionTimingFunction = props.transitionEasing;
  }

  if (isCustomPosition.value) {
    const p = props.position as AbsoluteInsetOverrides;
    if (p.top !== undefined) own.top = CssExtensions.toCss(p.top);
    if (p.right !== undefined) own.right = CssExtensions.toCss(p.right);
    if (p.bottom !== undefined) own.bottom = CssExtensions.toCss(p.bottom);
    if (p.left !== undefined) own.left = CssExtensions.toCss(p.left);
  }

  return normalizeStyle([attrs.style, own]);
});
</script>

<template>
  <!-- Presence clones the single child vnode to drive `data-state` + deferred unmount. -->
  <Presence v-if="isPresenceMode" :is-present="props.isOpen === true">
    <Primitive as="div" :as-child="props.asChild" :class="classes" :style="inlineStyle">
      <slot />
    </Primitive>
  </Presence>

  <Primitive v-else as="div" :as-child="props.asChild" :class="classes" :style="inlineStyle">
    <slot />
  </Primitive>
</template>
