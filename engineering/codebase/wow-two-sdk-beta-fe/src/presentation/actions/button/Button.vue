<script lang="ts">
import type { ButtonHTMLAttributes, VNodeChild } from 'vue';
import type {
  ColorProp,
  ColorTone,
  PaddingProp,
  RadiusProp,
  SizePreset,
  SizeUnion,
  SizeValue,
} from '../../../foundation/styles';
import type { ButtonVariant, ButtonShape, ButtonVariants } from './Button.variants';

/* Named size presets for variant lookup. Any other string / number / object flows to box-overrides. */
type ButtonSizePreset = Extract<SizePreset, 'xs' | 'sm' | 'md' | 'lg' | 'xl'>;

/* `size`: preset (variant class) | number/string (square inline dims) | `{width,height,minWidth,minHeight,boxSize}`.
   Raw/object forms set inline dims only — pair with `padding` if text-bearing. */
export type ButtonSize = SizeUnion<ButtonSizePreset>;

/** @internal The type-only surface `ButtonProps` inherits — native attributes plus the variant keys. `onClick` stays
    typed so `@click` compiles under strict templates; the button still gates it at runtime (see `handleClick`). */
type ButtonAttributes = Omit<ButtonHTMLAttributes, 'type' | 'disabled' | 'color'> &
  Omit<ButtonVariants, 'size' | 'variant' | 'tone' | 'shape'>;

/** Defines props for the button. */
export interface ButtonProps extends /* @vue-ignore */ ButtonAttributes {
  /** The visual surface style. */
  readonly variant?: ButtonVariant;

  /** The semantic tone palette. */
  readonly tone?: ColorTone;

  /** The button silhouette (default · square · circle). */
  readonly shape?: ButtonShape;

  /** The size — preset name OR raw value OR explicit dim object; see `ButtonSize` for details. */
  readonly size?: ButtonSize;

  /** The per-instance color override for `tone` — a string derives all slots, an object sets each. */
  readonly color?: ColorProp;

  /** The slot before children. Prefer the `leading` named slot. */
  readonly leadingSlot?: VNodeChild;

  /** The slot after children. Prefer the `trailing` named slot. */
  readonly trailingSlot?: VNodeChild;

  /** The content shown in place of children on hover / focus-visible (CSS-only swap — no JS hover state).
     Idle → children visible; hover/focus-visible → `hoverSlot` visible. Pairs with `variant="reveal"`
     for a reveal-on-hover icon swap. When undefined (and no `hover` slot), children render normally. */
  readonly hoverSlot?: VNodeChild;

  /** The indicator replacing the built-in `<Spinner/>` while loading. Prefer the `loading` slot. */
  readonly loadingSlot?: VNodeChild;

  /** The action-loading state — a spinner replaces the leading icon, the label stays, it dims and blocks clicks. */
  readonly isLoading?: boolean;

  /** The text that replaces the label while loading; omit it to keep the label. Consumer-supplied (i18n). */
  readonly loadingText?: string;

  /** The content-loading state — keeps size and radius, masks content; follows a `DataRegion` first load. */
  readonly isSkeleton?: boolean;

  /** The disabled state — drops focus order and clicks. Inherited from an enclosing `Field`. */
  readonly isDisabled?: boolean;

  /** The full-width state — stretches to fill container width. */
  readonly isFullWidth?: boolean;

  /** The multi-line state — allows label wrap; default truncates to single line. */
  readonly isMultiline?: boolean;

  /** The as-child flag — renders as the single child element via `Primitive`'s `asChild` merge. */
  readonly asChild?: boolean;

  /** The independent padding override (preset token or `{x, y}` object). */
  readonly padding?: PaddingProp;

  /** The independent radius override (preset token or raw value). */
  readonly radius?: RadiusProp;

  /** The explicit width override. Number = px; string = any CSS unit. */
  readonly width?: SizeValue;

  /** The explicit height override. Number = px; string = any CSS unit. */
  readonly height?: SizeValue;

  /** The min width reserved so the button doesn't reflow when its label morphs. */
  readonly minWidth?: SizeValue;

  /** The min height reserved — symmetric with `minWidth`. */
  readonly minHeight?: SizeValue;

  /** The square-size shorthand — fallback for `width` and `height`, which win when both are set. */
  readonly boxSize?: SizeValue;

  /** The button type. Default `ButtonType.Button` — NOT browser-default `'submit'`. */
  readonly type?: ButtonType;

  /** The long-press duration (ms). Default 500. Out-of-range values trigger a dev warning. */
  readonly longPressDelay?: number;

  /** The click-throttle window (ms) — first wins; subsequent swallowed via `preventDefault()`. */
  readonly debounceMs?: number;
}
</script>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  getCurrentInstance,
  normalizeStyle,
  onBeforeUnmount,
  useAttrs,
  useTemplateRef,
  watch,
  watchEffect,
  type ComponentPublicInstance,
  type StyleValue,
} from 'vue';
import type { ClassValue } from 'clsx';
import {
  AriaAttribute,
  composeEventHandlers,
  ButtonType,
  HtmlElement,
  Key,
  PressExtensions,
  type PressEvent,
} from '../../../foundation/dom';
import { cn, ColorExtensions, CssExtensions, type BoxSizeOverrides } from '../../../foundation/styles';
import { IsDevelopment } from '../../../foundation/config';
import { OptionalExtensions } from '../../../foundation/optionals';
import { Primitive } from '../../../foundation/primitives';
import { useFormControl } from '../../../foundation/primitives/formControlContext/FormControlContext';
import { Spinner } from '../../../foundation/icons';
import { useDebounceHandler } from '../../../foundation/async';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { buttonVariants } from './Button.variants';

const ComponentName = 'Button';

const ButtonSizePresets: ReadonlySet<string> = new Set<ButtonSizePreset>(['xs', 'sm', 'md', 'lg', 'xl']);

/* Observable state surfaced via the `data-state` DOM attribute. */
const ButtonDataState = {
  Loading: 'loading',
  Skeleton: 'skeleton',
  Disabled: 'disabled',
} as const;
type ButtonDataState = (typeof ButtonDataState)[keyof typeof ButtonDataState];

/* `inheritAttrs: false` because three attrs are *owned*, not forwarded: `class` and `style` fold
   into the component's own `cn()` / style resolution so consumer values still win last (plain
   fallthrough would append outside `cn()`, losing tailwind-merge conflict resolution), and
   `onClick` is intercepted so loading / skeleton / long-press / the debounce window can swallow a
   click before the consumer's handler sees it. Everything else passes straight through. */
/* The name is spelled out, not `ComponentName`: `defineOptions()` is hoisted out of `setup()`,
   so it cannot reference a locally declared const. */
/** Renders a button that runs one command, carrying tone and size variants plus loading and skeleton states. */
defineOptions({ name: 'Button', inheritAttrs: false });

const props = withDefaults(defineProps<ButtonProps>(), {
  type: ButtonType.Button,
  longPressDelay: PressExtensions.longPressDelay.default,
  /* Explicit `undefined` defaults keep Vue's boolean casting from turning an absent prop into
     `false` — `isDisabled` must stay undefined to inherit from an enclosing `Field`. */
  isDisabled: undefined,
  isLoading: undefined,
  isSkeleton: undefined,
  isFullWidth: undefined,
  isMultiline: undefined,
  asChild: false,
  /* `VNodeChild` includes `boolean`, so Vue's boolean casting turns an absent node-valued prop
     into `false` rather than `undefined` — which reads as "supplied" at every `!== undefined`
     check. An explicit `undefined` default suppresses the cast. */
  leadingSlot: undefined,
  trailingSlot: undefined,
  hoverSlot: undefined,
  loadingSlot: undefined,
});

const emit = defineEmits<{
  /** Fires when the press begins — pointer-down OR Space/Enter keydown (first event in a gesture). */
  'press-start': [event: PressEvent<HTMLButtonElement>];

  /** Fires when the press ends — pointer-up/cancel OR Space/Enter keyup. */
  'press-end': [event: PressEvent<HTMLButtonElement>];

  /** Fires when the pointer is held for `longPressDelay` ms. Suppresses the next click. */
  'long-press': [event: PressEvent<HTMLButtonElement>];
}>();

const slots = defineSlots<{
  /** The button's own label. Under `asChild`, the single element the button merges onto. */
  default?(): unknown;

  /** The indicator shown while loading. Falls back to `loadingSlot`, then to the built-in `Spinner`. */
  loading?(): unknown;

  /** Rendered before the label, for an icon. Falls back to `leadingSlot`. */
  leading?(): unknown;

  /** Rendered after the label, for an icon. Falls back to `trailingSlot`. */
  trailing?(): unknown;

  /** The content swapped in on hover / focus-visible, overlaying the label. Falls back to `hoverSlot`. */
  hover?(): unknown;
}>();

const attrs = useAttrs();

/* Stable render-only wrappers for the node-valued props, so each can render as the fallback of its
   named-slot twin. Stable identity (created once) keeps them from remounting on every render. */
const nodeProp = (read: () => VNodeChild) => defineComponent({ render: read });
const LeadingSlotProp = nodeProp(() => props.leadingSlot);
const TrailingSlotProp = nodeProp(() => props.trailingSlot);
const HoverSlotProp = nodeProp(() => props.hoverSlot);
const LoadingSlotProp = nodeProp(() => props.loadingSlot);

/* Inherit disabled-state from an enclosing `Field` when the local prop is omitted; standalone when
   no context. Bound to the object, never destructured — every field on it is a live getter. */
const formControl = useFormControl();
const resolvedDisabled = computed(() => props.isDisabled ?? formControl?.isDisabled ?? false);

/* An absent `isSkeleton` follows the nearest `DataRegion` first load; an explicit one wins either way. */
const skeleton = useSkeletonState(() => props.isSkeleton);
const skeletonActive = computed(() => skeleton.isSkeleton.value);
const loadingActive = computed(() => !skeletonActive.value && !!props.isLoading);
const isInactive = computed(() => loadingActive.value || skeletonActive.value || resolvedDisabled.value);

/* The spinner swaps with a leading icon when there is one; without one it centers over the label, whose
   box keeps the button's width. */
function hasLeading(): boolean {
  return slots.leading !== undefined || props.leadingSlot !== undefined;
}

const dataState = computed<ButtonDataState | undefined>(() =>
  skeletonActive.value
    ? ButtonDataState.Skeleton
    : loadingActive.value
      ? ButtonDataState.Loading
      : resolvedDisabled.value
        ? ButtonDataState.Disabled
        : undefined,
);

const safeLongPressDelay = computed(() =>
  !Number.isFinite(props.longPressDelay) ||
  props.longPressDelay < PressExtensions.longPressDelay.min ||
  props.longPressDelay > PressExtensions.longPressDelay.max
    ? PressExtensions.longPressDelay.default
    : props.longPressDelay,
);

watchEffect(() => {
  if (!IsDevelopment) return;
  if (props.isLoading && props.isSkeleton) {
    console.warn(
      `[${ComponentName}] \`isLoading\` and \`isSkeleton\` are mutually exclusive — \`isSkeleton\` takes precedence.`,
    );
  }
  if (safeLongPressDelay.value !== props.longPressDelay) {
    console.warn(
      `[${ComponentName}] longPressDelay=${props.longPressDelay}ms is outside reasonable range (${PressExtensions.longPressDelay.min}–${PressExtensions.longPressDelay.max}ms). Falling back to ${PressExtensions.longPressDelay.default}ms.`,
    );
  }
  if (
    slots.default === undefined &&
    attrs[AriaAttribute.Label] === undefined &&
    attrs[AriaAttribute.LabelledBy] === undefined
  ) {
    console.warn(
      `[${ComponentName}] icon-only button (no text children) is missing an accessible name — pass \`aria-label\` or \`aria-labelledby\` (Button.standard.md rule 12).`,
    );
  }
});

/* Parse the union-typed `size` prop into preset (for variant lookup) + box overrides (for inline dims). */
const parsedSize = computed(() => CssExtensions.parseSizeUnion<ButtonSizePreset>(props.size, ButtonSizePresets));

const rootClass = computed(() =>
  cn(
    buttonVariants({
      variant: props.variant,
      tone: props.tone,
      size: parsedSize.value.preset,
      shape: props.shape,
      fullWidth: props.isFullWidth,
      wrap: props.isMultiline,
    }),
    attrs.class as ClassValue,
  ),
);

const overrideStyle = computed<StyleValue | undefined>(() => {
  const padStyle = CssExtensions.resolvePadding(props.padding);
  const radStyle = CssExtensions.resolveRadius(props.radius);
  /* BoxLayout overrides — `size` is the base; flat width / height / minWidth / minHeight / boxSize win. */
  const composedBox: BoxSizeOverrides = {
    ...(parsedSize.value.box ?? {}),
    ...(props.width !== undefined ? { width: props.width } : {}),
    ...(props.height !== undefined ? { height: props.height } : {}),
    ...(props.minWidth !== undefined ? { minWidth: props.minWidth } : {}),
    ...(props.minHeight !== undefined ? { minHeight: props.minHeight } : {}),
    ...(props.boxSize !== undefined ? { boxSize: props.boxSize } : {}),
  };
  const boxStyle = CssExtensions.resolveBoxSize(composedBox);
  /* Per-instance color override → sets CSS vars on element, scoped locally. */
  const colorStyle = ColorExtensions.toneColorOverride(props.color, props.tone);
  const consumerStyle = attrs.style as StyleValue | undefined;
  if (!padStyle && !radStyle && !boxStyle && !colorStyle && !consumerStyle) return undefined;
  return normalizeStyle([colorStyle, padStyle, radStyle, boxStyle, consumerStyle]);
});

// ---------------------------------------------------------------------------
// Press / long-press / debounce wiring.
// ---------------------------------------------------------------------------

let isPressing = false;
let longPressTimer: ReturnType<typeof setTimeout> | undefined;
let longPressFired = false;

const instance = getCurrentInstance();

/* React armed the long-press timer only when an `onLongPress` prop was passed. A declared emit has
   no such signal — `emit()` on an unlistened event is a silent no-op, but the fired flag would
   still swallow the following click on every long hold. The listener is read off the incoming
   vnode props at event time (declared-emit listeners are stripped from `attrs`), so an unlistened
   button never arms the timer at all. */
function hasLongPressListener(): boolean {
  return instance?.vnode.props?.onLongPress !== undefined;
}

onBeforeUnmount(() => {
  if (longPressTimer !== undefined) clearTimeout(longPressTimer);
});

function cancelLongPress(): void {
  if (longPressTimer !== undefined) {
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
}

watch(isInactive, (inactive) => {
  if (!inactive) return;
  cancelLongPress();
  isPressing = false;
  longPressFired = false;
});

function endPress(event: PressEvent<HTMLButtonElement>): void {
  if (isPressing) {
    isPressing = false;
    emit('press-end', event);
  }
}

function handlePointerDown(event: PointerEvent): void {
  if (isInactive.value || event.defaultPrevented || (event.button != null && event.button !== 0)) return;
  // Cancel any pending timer, then arm only on the first pointer of a gesture — a second
  // pointer-down must not stack a second long-press timer.
  cancelLongPress();
  if (!isPressing) {
    const pressEvent = event as PressEvent<HTMLButtonElement>;
    isPressing = true;
    longPressFired = false;
    emit('press-start', pressEvent);
    if (hasLongPressListener()) {
      longPressTimer = setTimeout(() => {
        if (isInactive.value) return;
        longPressFired = true;
        emit('long-press', pressEvent);
        longPressTimer = undefined;
      }, safeLongPressDelay.value);
    }
  }
}

function handlePointerUp(event: PointerEvent): void {
  cancelLongPress();
  endPress(event as PressEvent<HTMLButtonElement>);
}

function handlePointerCancel(event: PointerEvent): void {
  cancelLongPress();
  endPress(event as PressEvent<HTMLButtonElement>);
}

function handlePointerLeave(event: PointerEvent): void {
  // The subsequent pointerup may target elsewhere; release this gesture at its boundary.
  cancelLongPress();
  endPress(event as PressEvent<HTMLButtonElement>);
}

const isActivationKey = (event: KeyboardEvent) => event.key === Key.Space || event.key === Key.Enter;

function handleKeyDown(event: KeyboardEvent): void {
  if (isInactive.value || event.defaultPrevented || event.isComposing) return;
  if (isActivationKey(event) && !event.repeat && !isPressing) {
    isPressing = true;
    longPressFired = false;
    emit('press-start', event as PressEvent<HTMLButtonElement>);
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  if (isActivationKey(event) && isPressing) {
    isPressing = false;
    emit('press-end', event as PressEvent<HTMLButtonElement>);
  }
}

/**
 * The consumer's listener for one attr, normalised. Vue merges several listeners for the same
 * event into an array (a wrapper component that binds `@click` on top of a forwarded `onClick`
 * produces exactly that), so the raw attr is not always callable.
 */
function toHandler<E extends Event>(value: unknown): ((event: E) => void) | undefined {
  if (typeof value === 'function') return value as (event: E) => void;
  if (!Array.isArray(value)) return undefined;
  const handlers = value.filter((entry): entry is (event: E) => void => typeof entry === 'function');
  if (handlers.length === 0) return undefined;
  return (event) => {
    for (const handler of handlers) handler(event);
  };
}

// Long-press suppression happens BEFORE this — a suppressed click does NOT advance the throttle window.
const debouncedOnClick = useDebounceHandler(
  (event: MouseEvent) => toHandler<MouseEvent>(attrs.onClick)?.(event),
  () => props.debounceMs,
);

function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  if (isInactive.value) {
    // Block native activation too — e.g. `type="submit"` must not submit while loading.
    event.preventDefault();
    return;
  }
  if (longPressFired) {
    longPressFired = false;
    event.preventDefault();
    return;
  }
  debouncedOnClick(event);
}

/* The attrs the component owns rather than forwards — see the `inheritAttrs: false` note above.
   Event names carry the single casing Vue's runtime understands (`on` + the event name with only
   its first letter capitalised); `onPointerDown` would bind a `pointer-down` listener. */
const OwnedAttributes: ReadonlySet<string> = new Set([
  'class',
  'style',
  'onClick',
  'onPointerdown',
  'onPointerup',
  'onPointercancel',
  'onPointerleave',
  'onKeydown',
  'onKeyup',
]);

const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/** The consumer's own listener for an owned event, so it can be chained ahead of the component's. */
function consumerHandler<E extends Event>(name: string): ((event: E) => void) | undefined {
  return toHandler<E>(attrs[name]);
}

/* Assembled in the React original's spread order: the component's own attributes first, its event
   chain next, consumer attrs last so they still win. */
const rootProps = computed(() => ({
  type: props.asChild ? undefined : props.type,
  class: rootClass.value,
  style: overrideStyle.value,
  disabled: OptionalExtensions.from(resolvedDisabled.value, true),
  [AriaAttribute.Busy]: OptionalExtensions.from(loadingActive.value || skeletonActive.value, true),
  [AriaAttribute.Disabled]: OptionalExtensions.from(isInactive.value, true),
  tabindex: OptionalExtensions.from(skeletonActive.value || resolvedDisabled.value, -1),
  'data-state': dataState.value,
  onClick: handleClick,
  onPointerdown: composeEventHandlers(consumerHandler<PointerEvent>('onPointerdown'), handlePointerDown),
  onPointerup: composeEventHandlers(consumerHandler<PointerEvent>('onPointerup'), handlePointerUp),
  onPointercancel: composeEventHandlers(consumerHandler<PointerEvent>('onPointercancel'), handlePointerCancel),
  onPointerleave: composeEventHandlers(consumerHandler<PointerEvent>('onPointerleave'), handlePointerLeave),
  onKeydown: composeEventHandlers(consumerHandler<KeyboardEvent>('onKeydown'), handleKeyDown),
  onKeyup: composeEventHandlers(consumerHandler<KeyboardEvent>('onKeyup'), handleKeyUp),
  ...passthroughAttrs.value,
}));

const root = useTemplateRef<ComponentPublicInstance>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
const el = computed<HTMLElement | null>(() => {
  const node = root.value?.$el;
  return node instanceof HTMLElement ? node : null;
});

defineExpose({ el });
</script>

<template>
  <!-- Renders an action button — for text and/or icon content. -->
  <Primitive ref="root" :as="HtmlElement.Button" :as-child="asChild" v-bind="rootProps">
    <!-- asChild → the merge target owns its children; leading/trailing/loading chrome is not rendered. -->
    <slot v-if="asChild" />

    <template v-else-if="loadingActive && (hasLeading() || loadingText !== undefined)">
      <!-- The spinner stands where the leading icon was; the label (or loadingText) stays readable. -->
      <slot name="loading">
        <LoadingSlotProp v-if="loadingSlot !== undefined" />
        <Spinner v-else />
      </slot>
      <span v-if="loadingText !== undefined">{{ loadingText }}</span>
      <slot v-else />
      <slot name="trailing"><TrailingSlotProp v-if="trailingSlot !== undefined" /></slot>
    </template>

    <template v-else-if="loadingActive">
      <!-- No icon to swap: the label turns transparent, keeping the width and the accessible name, and the
           spinner centers over it. -->
      <span class="relative inline-flex items-center justify-center">
        <span class="inline-flex items-center gap-2 opacity-0">
          <slot />
          <slot name="trailing"><TrailingSlotProp v-if="trailingSlot !== undefined" /></slot>
        </span>
        <span class="absolute inset-0 inline-flex items-center justify-center">
          <slot name="loading">
            <LoadingSlotProp v-if="loadingSlot !== undefined" />
            <Spinner v-else />
          </slot>
        </span>
      </span>
    </template>

    <template v-else-if="hoverSlot !== undefined || $slots.hover">
      <slot name="leading"><LeadingSlotProp v-if="leadingSlot !== undefined" /></slot>
      <!-- CSS-only hover/focus-visible swap: children occupy the box and reserve its size;
           the hover content overlays it centered. Toggle via `group-hover`/`group-focus-visible`
           on the root `group` — no JS hover state. `aria-hidden` on the hidden layer so AT
           reads one label. -->
      <span class="relative inline-flex items-center justify-center">
        <span class="inline-flex items-center justify-center group-hover:invisible group-focus-visible:invisible">
          <slot />
        </span>
        <span
          aria-hidden="true"
          class="invisible absolute inset-0 inline-flex items-center justify-center group-hover:visible group-focus-visible:visible"
        >
          <slot name="hover"><HoverSlotProp v-if="hoverSlot !== undefined" /></slot>
        </span>
      </span>
      <slot name="trailing"><TrailingSlotProp v-if="trailingSlot !== undefined" /></slot>
    </template>

    <template v-else>
      <slot name="leading"><LeadingSlotProp v-if="leadingSlot !== undefined" /></slot>
      <slot />
      <slot name="trailing"><TrailingSlotProp v-if="trailingSlot !== undefined" /></slot>
    </template>
  </Primitive>
</template>
