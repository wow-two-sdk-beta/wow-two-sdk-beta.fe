<script lang="ts">
import type { VNodeChild } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';
import { type ColorProp, type ColorTone } from '../../../foundation/styles';
import type { ButtonProps } from '../../actions/button';
import type { ToggleInputElement, ToggleInputVariant, ToggleInputVariants } from './ToggleInput.variants';

/* Fn signature for state-aware string props. */
type PressedFn<T> = (args: { pressed: boolean }) => T;
type StateAware<T> = T | PressedFn<T>;

/* `ButtonProps` and `ToggleInputVariants` are `@vue-ignore`d: everything not declared below
   flows to the underlying `Button` through attribute fallthrough (the counterpart of the
   original's `{...buttonProps}` spread), and `ToggleInputVariants` resolves through
   `typeof toggleButtonVariants`, which the SFC prop compiler cannot walk. */
/** @internal An attribute name this component derives or requires. */
type LabelAttribute = typeof AriaAttribute.Label;

/* The state-aware accessible label rides on the ignored heritage rather than the body — a declared
   `'aria-label'` would be camelized to `props.ariaLabel` and never reach the DOM. */
type ToggleInputAttributes = Omit<ButtonProps, 'variant' | 'tone' | 'children' | 'title' | LabelAttribute | 'color'> &
  Partial<Record<LabelAttribute, StateAware<string>>>;

export interface ToggleInputProps
  extends /* @vue-ignore */ ToggleInputAttributes, /* @vue-ignore */ Omit<ToggleInputVariants, 'variant' | 'tone'> {
  /** The press-state surface style. */
  readonly variant?: ToggleInputVariant;

  /** The semantic tone palette. */
  readonly tone?: ColorTone;

  /** The controlled pressed state. */
  readonly modelValue?: boolean;

  /** The uncontrolled initial state. Ignored if `modelValue` is set. */
  readonly defaultValue?: boolean;

  /** The identity inside a `ToggleGroup`, keying its selection. Also the native `value` attr. */
  readonly value?: string;

  /** The tooltip text — a string, or a fn receiving `{ pressed }` for a state-aware label. */
  readonly title?: StateAware<string>;

  /** The per-instance color override — applies to the active `tone`'s theme tokens. See `ColorProp`. */
  readonly color?: ColorProp;

  /** The rich tooltip for icon-only toggles. A string degrades to native `title`; a node is ignored. */
  readonly tooltip?: VNodeChild;

  /** The render element. `div` (role=button) lets interactive children nest. Default `button`. */
  readonly as?: ToggleInputElement;
  /** Prevents changing the pressed state while remaining focusable. */
  readonly isReadOnly?: boolean;
  /** Keeps the segment's box and draws its label as a bar, inert; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, inject, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, ColorTone as ColorToneValue } from '../../../foundation/styles';
import { Key } from '../../../foundation/dom';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import Button from '../../actions/button/Button.vue';
import { ButtonVariant } from '../../actions/button';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { SkeletonStateLine } from '../../feedback/skeletonState/SkeletonStateLine';
import { ToggleGroupKey } from '../toggleGroup/ToggleGroupContext';
import { ToggleItemRole } from '../toggleGroup/ToggleGroup.variants';
import {
  toggleButtonVariants,
  ToggleInputElement as ToggleInputElementValue,
  ToggleInputVariant as ToggleInputVariantValue,
} from './ToggleInput.variants';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call; everything else is
   forwarded onto `Button` by hand, which is where the original's `{...buttonProps}` landed. */
/** Renders a two-state action button that shows and announces whether it is currently pressed. */
defineOptions({ name: 'ToggleInput', inheritAttrs: false });

const props = withDefaults(defineProps<ToggleInputProps>(), {
  variant: ToggleInputVariantValue.Ghost,
  tone: ColorToneValue.Primary,
  as: ToggleInputElementValue.Button,
  /* Explicit `undefined` keeps Vue's boolean casting from collapsing an absent `modelValue` to
     `false`, which would pin the toggle to the controlled branch permanently. */
  modelValue: undefined,
  defaultValue: undefined,
  /* `VNodeChild` includes `boolean`, so Vue's boolean casting turns an absent node-valued prop
     into `false` rather than `undefined` — which reads as "supplied" at every `!== undefined`
     check. An explicit `undefined` default suppresses the cast. */
  tooltip: undefined,
  isReadOnly: undefined,
  isSkeleton: undefined,
});

/* A segment keeps its own box — border, padding, radius — and only its label turns into a bar; the pressed state
   hides. The inner `Button` stays out of skeleton mode, so it does not fill the whole segment. */
const skeleton = useSkeletonState(() => props.isSkeleton);

const emit = defineEmits<{
  /** Fires when the reader turns the toggle on or off, carrying the new pressed state. */
  'update:modelValue': [pressed: boolean];
}>();

defineSlots<{
  /** The button's label — receives `{ pressed }` so the content can track the toggle state. */
  default(props: { pressed: boolean }): unknown;
}>();

const attrs = useAttrs();
const field = useFormControl();
const attrFlag = (key: string): boolean => attrs[key] === true || attrs[key] === '' || attrs[key] === 'true';
const inactive = computed(
  () =>
    attrFlag('disabled') ||
    attrFlag('isDisabled') ||
    attrFlag('is-disabled') ||
    attrFlag('isLoading') ||
    attrFlag('is-loading') ||
    attrFlag('readonly') ||
    Boolean(props.isReadOnly ?? field?.isReadOnly) ||
    Boolean(field?.isDisabled),
);

/* Present only inside a `ToggleGroup`; standalone toggles own their state. */
const group = inject(ToggleGroupKey, null);

const pressedCtl = useControlled<boolean>({
  /* Inside a group the selection lives on the group, which makes the item controlled — the same
     state the original produced by cloning `modelValue` onto each child. An explicit `modelValue`
     prop still wins over the group. */
  controlled: () => props.modelValue ?? group?.isPressed(props.value),
  default: props.defaultValue ?? false,
  onChange: (pressed) => emit('update:modelValue', pressed),
});
const { value: pressed, setValue: setPressed } = pressedCtl;

/* `aria-label` is read off `attrs`, not `props`: Vue camelizes declared prop keys, so a declared
   `'aria-label'` would arrive as `props.ariaLabel` and never render. It is stripped here and
   re-bound onto `Button` below, so the state-resolved value is the one that lands. */
const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const isDiv = computed(() => props.as === ToggleInputElementValue.Div);

/* Resolve state-aware string props to plain strings for the underlying Button. */
const resolvedTitle = computed(() => {
  const title = typeof props.title === 'function' ? props.title({ pressed: pressed.value }) : props.title;
  /* `presentation/display` has not ported yet, so a string `tooltip` degrades to the native
     attribute rather than silently vanishing. An explicit `title` always wins. */
  return title ?? (typeof props.tooltip === 'string' ? props.tooltip : undefined);
});

const resolvedAriaLabel = computed(() => {
  const label = attrs[AriaAttribute.Label] as StateAware<string> | undefined;
  return typeof label === 'function' ? label({ pressed: pressed.value }) : label;
});

const rootClass = computed(() =>
  cn(toggleButtonVariants({ variant: props.variant, tone: props.tone }), attrs.class as ClassValue),
);

/* Tablist wiring is layered by the group, exactly as the original's `cloneElement` did. */
const itemRole = computed(() => (group?.itemRole === ToggleItemRole.Tab ? ('tab' as const) : undefined));
const ariaSelected = computed(() => (itemRole.value === 'tab' ? pressed.value : undefined));

function toggle(): void {
  if (inactive.value) return;
  setPressed(!pressed.value);
  group?.toggle(props.value);
}

/* Chained after the consumer's own click (attribute fallthrough puts theirs first) and skipped
   when they called `preventDefault()` — the original's `onClick?.(e); if (!e.defaultPrevented)`. */
function handleClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  toggle();
}

function handleDivKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || inactive.value) return;
  if (event.target !== event.currentTarget) return;
  if (event.key === Key.Space || event.key === Key.Enter) {
    event.preventDefault();
    toggle();
  }
}

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  pressedCtl.reset();
});
</script>

<template>
  <!-- Two-state action button (on/off) — sets `aria-pressed` + `data-pressed="true|false"`. Wraps
       Button to inherit the size union, shape, asChild, loading, padding/radius. Press appearance
       lives in `toggleButtonVariants` (variant × tone matrix); ToggleInput's own appearance
       overrides Button's neutral-ghost baseline via class order. -->
  <Button
    :key="formResetRevision"
    :variant="ButtonVariant.Ghost"
    :tone="tone ?? undefined"
    :color="color"
    :as-child="isDiv"
    :value="value"
    :aria-pressed="pressed"
    :aria-disabled="inactive || undefined"
    :aria-label="resolvedAriaLabel"
    :data-pressed="pressed && !skeleton.isSkeleton.value ? 'true' : 'false'"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :inert="skeleton.isSkeleton.value || undefined"
    :is-skeleton="false"
    :title="resolvedTitle"
    :role="itemRole"
    :aria-selected="ariaSelected"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @click="handleClick"
  >
    <!-- `as="div"` → render through the asChild merge onto a real <div> so consumers may nest
         interactive children (button-in-button is invalid markup). Keyboard parity added here. -->
    <div v-if="isDiv" role="button" :tabindex="inactive ? -1 : 0" @keydown="handleDivKeyDown">
      <SkeletonStateLine :is-skeleton="skeleton.isSkeleton.value"><slot :pressed="pressed" /></SkeletonStateLine>
    </div>
    <SkeletonStateLine v-else :is-skeleton="skeleton.isSkeleton.value"><slot :pressed="pressed" /></SkeletonStateLine>
  </Button>
  <input
    ref="formResetAnchor"
    type="hidden"
    :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
    aria-hidden="true"
  />
</template>
