<script lang="ts">
import type { HTMLAttributes } from 'vue';
import type { IconAdapter } from '../../../foundation/icons';
import type { ColorTone, Orientation } from '../../../foundation/styles';
import type { ToggleInputVariant } from '../toggleInput';
import type { ToggleGroupVariant, ToggleItemRole, ToggleMode } from './ToggleGroup.variants';

/** Defines one item the `options` prop renders as a `ToggleGroupItem`. */
export interface ToggleGroupOption {
  /** The identity keying the item in the selection. */
  readonly value: string;

  /** The item's text and, with the count, its accessible name. */
  readonly label: string;

  /** The tally after the label. */
  readonly count?: number;

  /** The icon before the label. */
  readonly icon?: IconAdapter;

  /** Blocks this item. */
  readonly isDisabled?: boolean;
}

/**
 * Props for the group, generic over the value type `T`.
 *
 * `T` defaults to `string`, so untyped usage keeps the historical `string | null`
 * shape. Pass a string-literal union or string enum
 * (`<ToggleGroup<GradientType> …>`) to have `modelValue` / `@update:modelValue` emit
 * that narrowed type instead — no cast needed at the call site.
 *
 * Divergence from the React original: there, `type` discriminated a `SingleProps<T>`
 * / `MultiProps` union, so single mode saw `T | null` and multi mode `readonly
 * string[]`. Vue's prop compiler flattens a union type into one merged prop set, so
 * `modelValue` / `defaultValue` carry both shapes and the mode still decides which is
 * live at runtime.
 */
export interface ToggleGroupProps<T extends string = string> extends /* @vue-ignore */ Omit<
  HTMLAttributes,
  'defaultValue' | 'onChange'
> {
  /** The selection cardinality — `Single` for at-most-one, `Multi` for any number. */
  readonly type?: ToggleMode;

  /** The controlled value — `T | null` in single mode, a string array in multi mode. */
  readonly modelValue?: T | null | ReadonlyArray<string>;

  /** The uncontrolled initial value. Ignored once `modelValue` is set. */
  readonly defaultValue?: T | null | ReadonlyArray<string>;

  /** The layout axis of the button row/column. @default Orientation.Horizontal */
  readonly orientation?: Orientation;

  /** The attached state — collapses inner radii into a connected row/column. @default true */
  readonly isAttached?: boolean;

  /**
   * The visual style.
   * - `default` — standard button row/column (borders + attached radii).
   * - `segmented` — iOS-style connected pill row on a muted track; the active
   *   segment lifts to a `background` surface. Forces `isAttached`.
   * - `pill` — individually-separated rounded pills (each item its own detached
   *   chip). Forces detached (never attaches). Mark a label with `data-toggle-label`
   *   to show it beside the pressed icon or on hover and keyboard focus.
   */
  readonly variant?: ToggleGroupVariant;

  /**
   * The ARIA role wiring.
   * - `group` (default) — `role="group"` of independent toggle buttons.
   * - `tab` — opt into tablist semantics: root renders `role="tablist"` and each
   *   item `role="tab"` + `aria-selected`. Pairs naturally with single-select.
   * @default ToggleItemRole.Group
   */
  readonly itemRole?: ToggleItemRole;

  /**
   * The equal-width state — lays items out as equal-width tiles (each `flex-1 basis-0`)
   * for an icon category strip where every cell should share the row width. Additive;
   * the default keeps intrinsic item widths.
   * @default false
   */
  readonly equalWidth?: boolean;
  /** Keeps every segment's box and draws their labels as bars, inert; defaults to the nearest `DataRegion`. */
  readonly isSkeleton?: boolean;

  /** The items to render, one `ToggleGroupItem` each, before any items in the default slot. */
  readonly options?: ReadonlyArray<ToggleGroupOption>;

  /** The press-state surface style of the `options` items. Items in the slot choose their own. */
  readonly itemVariant?: ToggleInputVariant;

  /** The semantic tone of the `options` items. Items in the slot choose their own. */
  readonly itemTone?: ColorTone;
}
</script>

<script setup lang="ts" generic="T extends string = string">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Orientation as OrientationValue } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { provideSkeletonState, useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { ToggleGroupKey } from './ToggleGroupContext';
import ToggleGroupItem from './ToggleGroupItem.vue';
import {
  ToggleGroupVariant as ToggleGroupVariantValue,
  ToggleItemRole as ToggleItemRoleValue,
  ToggleMode as ToggleModeValue,
} from './ToggleGroup.variants';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a row of toggle buttons sharing one selection — at most one active, or any number. */
defineOptions({ name: 'ToggleGroup', inheritAttrs: false });

const props = withDefaults(defineProps<ToggleGroupProps<T>>(), {
  orientation: OrientationValue.Horizontal,
  isAttached: true,
  variant: ToggleGroupVariantValue.Default,
  itemRole: ToggleItemRoleValue.Group,
  equalWidth: false,
  type: undefined,
  modelValue: undefined,
  defaultValue: undefined,
  isSkeleton: undefined,
  options: undefined,
  itemVariant: undefined,
  itemTone: undefined,
});

/* One flag switches every segment: each keeps its box and draws its label as a bar. */
const skeleton = useSkeletonState(() => props.isSkeleton);
provideSkeletonState(skeleton);

const emit = defineEmits<{
  /** Fires when the reader changes the selection — `T | null` in single mode, the array in multi mode. */
  'update:modelValue': [value: T | null | ReadonlyArray<string>];
}>();

defineSlots<{
  /** The `ToggleInput` or `ToggleGroupItem` children whose selection this group coordinates. */
  default(): unknown;
}>();

const attrs = useAttrs();

const mode = computed(() => (props.type === ToggleModeValue.Multi ? ToggleModeValue.Multi : ToggleModeValue.Single));
const isSegmented = computed(() => props.variant === ToggleGroupVariantValue.Segmented);
const isPill = computed(() => props.variant === ToggleGroupVariantValue.Pill);
const isTablist = computed(() => props.itemRole === ToggleItemRoleValue.Tab);
const isHorizontal = computed(() => props.orientation === OrientationValue.Horizontal);
// Segmented is inherently an attached pill row — the muted track only reads as one control when its
// segments touch. Pill is the inverse — always detached chips, never attached.
const attached = computed(() => (isPill.value ? false : isSegmented.value || props.isAttached));

const singleCtl = useControlled<string | null>({
  controlled: () =>
    mode.value === ToggleModeValue.Single ? (props.modelValue as string | null | undefined) : undefined,
  default: props.type !== ToggleModeValue.Multi ? ((props.defaultValue as string | null | undefined) ?? null) : null,
  onChange: (next) => {
    if (mode.value === ToggleModeValue.Single) emit('update:modelValue', next as T | null);
  },
});
const { value: singleValue, setValue: setSingleValue } = singleCtl;

const multiCtl = useControlled<ReadonlyArray<string>>({
  controlled: () =>
    mode.value === ToggleModeValue.Multi ? (props.modelValue as ReadonlyArray<string> | undefined) : undefined,
  default:
    props.type === ToggleModeValue.Multi ? ((props.defaultValue as ReadonlyArray<string> | undefined) ?? []) : [],
  onChange: (next) => {
    if (mode.value === ToggleModeValue.Multi) emit('update:modelValue', next);
  },
});
const { value: multiValue, setValue: setMultiValue } = multiCtl;

function isPressed(childValue: string | undefined): boolean {
  if (childValue === undefined) return false;
  return mode.value === ToggleModeValue.Single
    ? singleValue.value === childValue
    : multiValue.value.includes(childValue);
}

function togglePressed(childValue: string | undefined): void {
  if (childValue === undefined) return;
  if (mode.value === ToggleModeValue.Single) {
    setSingleValue(singleValue.value === childValue ? null : childValue);
  } else {
    setMultiValue(
      multiValue.value.includes(childValue)
        ? multiValue.value.filter((entry) => entry !== childValue)
        : [...multiValue.value, childValue],
    );
  }
}

/* Each `ToggleInput` child reads its own slice off this — the provide/inject replacement for the
   original's `Children.map` + `cloneElement`. `itemRole` is a live getter, not a snapshot. */
provide(ToggleGroupKey, {
  isPressed,
  toggle: togglePressed,
  get itemRole() {
    return props.itemRole;
  },
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex',
    // Horizontal wraps to a new line when the row is too narrow for every item — a vertical
    // group already stacks, so wrapping is horizontal-only. `isAttached`'s corner-merge and
    // `-ml-px` join below still address only the literal first/last child, not each wrapped
    // line's edges: a middle row's start/end items stay square-cornered and the wrapped line's
    // leading item carries a stray `-ml-px`. Left as-is — scoping either to "first/last of its
    // own flex line" has no CSS selector (no `:has()` sees sibling geometry), and the review's
    // complaint is the overflow, not the attached seam.
    isHorizontal.value ? 'flex-row flex-wrap' : 'flex-col',
    // The gap cap keeps each item's touch hit area (`CoarseHitArea`) off its neighbours': attached items touch, so
    // theirs stops at the box along the row; detached ones sit 8px apart plus their two 1px borders. Only the axis
    // the items line up on is capped, so a row's items keep their 44px height.
    attached.value
      ? isHorizontal.value
        ? '[&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px [--coarse-hit-gap-x:0px]'
        : '[&>*]:rounded-none [&>*:first-child]:rounded-t-md [&>*:last-child]:rounded-b-md [&>*:not(:first-child)]:-mt-px [--coarse-hit-gap-y:0px]'
      : isHorizontal.value
        ? 'gap-2 [--coarse-hit-gap-x:10px]'
        : 'gap-2 [--coarse-hit-gap-y:10px]',
    // Segmented: muted track + reset segment chrome; active segment lifts to a `background` surface.
    isSegmented.value && [
      'rounded-md bg-muted p-1',
      '[&>*]:rounded-md! [&>*]:!ml-0 [&>*]:border-transparent! [&>*]:bg-transparent!',
      '[&>*[data-pressed=true]]:bg-background! [&>*[data-pressed=true]]:text-foreground! [&>*[data-pressed=true]]:shadow-sm',
    ],
    // Segmented skeleton: every segment lifts like the active one, so its label bar reads against the muted track.
    isSegmented.value && skeleton.isSkeleton.value && '[&>*]:bg-background!',
    // Pill: fully-rounded detached chips (gap already applied via the non-attached branch above).
    isPill.value && [
      '[&>*]:rounded-full!',
      // Only pills that opt in with a label marker change. On touch, their labels stay inline.
      '[@media(hover:hover)]:[&>[data-pressed=false]:has([data-toggle-label])]:relative',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:pointer-events-none',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:invisible',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:absolute',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:start-0',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:top-full',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:z-10',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:mt-1',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:whitespace-nowrap',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:rounded-md',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:bg-popover',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:px-2',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:py-1',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:text-popover-foreground',
      '[@media(hover:hover)]:[&>[data-pressed=false]_[data-toggle-label]]:shadow-md',
      '[@media(hover:hover)]:[&>[data-pressed=false]:is(:hover,:focus-visible)_[data-toggle-label]]:visible',
    ],
    // Equal-width tiles: every item shares the row/column extent (icon category strip).
    props.equalWidth && '[&>*]:flex-1 [&>*]:basis-0',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  if (props.type === ToggleModeValue.Multi) multiCtl.reset();
  else singleCtl.reset();
});
</script>

<template>
  <!-- Coordinates a row/column of ToggleInput children — `type="single" | "multi"`. -->
  <div
    :key="formResetRevision"
    ref="root"
    :role="isTablist ? 'tablist' : 'group'"
    :aria-orientation="isTablist ? orientation : undefined"
    :data-orientation="orientation"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :label="option.label"
      :count="option.count"
      :icon="option.icon"
      :is-disabled="option.isDisabled"
      :variant="itemVariant"
      :tone="itemTone"
    />
    <slot />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
