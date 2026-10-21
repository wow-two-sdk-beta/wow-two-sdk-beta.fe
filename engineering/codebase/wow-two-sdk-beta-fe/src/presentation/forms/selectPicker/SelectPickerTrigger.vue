<script lang="ts">
import type { SizeValue } from '../../../foundation/styles';
import type { InputState } from '../InputStyles';
import type { SelectPickerSize } from './SelectPicker.variants';

/** Represents the prop surface of the `SelectPickerTrigger`. */
export interface SelectPickerTriggerProps {
  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The validity surface. */
  readonly state?: InputState;

  /** Stretches the trigger across its container. Default `true`; `false` sizes it to its value. */
  readonly isFullWidth?: boolean;

  /** The trigger width — number = px, string = any CSS length. Wins over `isFullWidth`. */
  readonly width?: SizeValue;

  /** Draws the trigger as its own placeholder, inert; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}

/** Contains the icon Tailwind classes per trigger size. */
const TriggerIconClasses = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

/** Contains the clear-button hit-box Tailwind classes per trigger size.
 *  The visual glyph stays small; the hit target is floored at 24×24 (WCAG 2.2 SC 2.5.8). */
const TriggerClearBoxClasses = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

/** Contains the vertical-divider height Tailwind classes per trigger size. */
const TriggerDividerClasses = {
  xs: 'h-3',
  sm: 'h-3.5',
  md: 'h-4',
  lg: 'h-5',
} as const;

/** Contains the right-offset classes aligning the overlaid clear button with its reserved slot
 *  (trigger `px` + chevron width + `gap-1.5` + 1px divider + `gap-1.5`). */
const TriggerClearOffsetClasses = {
  xs: 'right-[35px]',
  sm: 'right-[37px]',
  md: 'right-[41px]',
  lg: 'right-[49px]',
} as const;

/** Resolves the trigger's `data-state` — open wins, then loading/disabled/invalid. */
function triggerDataState(
  open: boolean,
  isLoading: boolean,
  isDisabled: boolean,
  isInvalid: boolean,
): string | undefined {
  if (open) return 'open';
  if (isLoading) return 'loading';
  if (isDisabled) return 'disabled';
  if (isInvalid) return 'invalid';
  return undefined;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronDown, Loader2, X } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { cn, CssExtensions } from '../../../foundation/styles';
import { useTypeahead } from '../../../foundation/selection';
import { Announce } from '../../../foundation/primitives';
import { PopoverTrigger } from '../../overlays';
import { InputState as InputStateValue } from '../InputStyles';
import { selectTriggerVariants } from './SelectPicker.variants';
import { useSelectContext, type ItemRegistryEntry } from './SelectPickerContext';
import SelectPickerValue from './SelectPickerValue.vue';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';

const ChevronDownIcon = ChevronDown;
const LoaderIcon = Loader2;
const ClearIcon = X;

/** Renders the button that opens the dropdown, showing the selection, a chevron, and an optional clear control. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call, and so the rest
   of the attrs land on the inner `<button>` rather than the positioning wrapper. */
defineOptions({ name: 'SelectPickerTrigger', inheritAttrs: false });

/** The trigger content — defaults to `<SelectPickerValue />`. React's `children`. */
defineSlots<{ default?(): unknown }>();

const props = withDefaults(defineProps<SelectPickerTriggerProps>(), {
  isFullWidth: true,
  width: undefined,
  isSkeleton: undefined,
});

/* The trigger keeps its height, width, radius and border width; its value, chevron and clear control are masked. */
const skeleton = useSkeletonState(() => props.isSkeleton);

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useSelectContext();

/* `aria-label` is read off `attrs`, never declared: a declared `'aria-label'` prop arrives as
   `props.ariaLabel`, so `props['aria-label']` is always undefined and no accessible name
   renders. Left in the fallthrough set, it also still lands on the button. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

const triggerState = computed(() => props.state ?? (ctx.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

/* Closed-only type-to-select (native `<select>`): typing picks the matching option without
   opening; while OPEN the inner ListboxPicker owns typeahead. Matches each item's `entry.text`,
   anchored at the current selection so repeats cycle from there. */
const triggerTypeahead = useTypeahead<ItemRegistryEntry>({
  items: () => ctx.items,
  getLabel: (entry) => entry.text,
  isDisabled: (entry) => entry.isDisabled,
  getActiveIndex: () => (ctx.hasSelection ? ctx.items.findIndex((i) => ctx.keyEquals(i.itemKey, ctx.selectedKey)) : -1),
  onMatch: (entry) => ctx.onSelect(entry),
  enabled: () => !ctx.open && !ctx.isDisabled && !ctx.isLoading,
});

function handleTriggerKeyDown(event: KeyboardEvent): void {
  /* React called the consumer's `onKeyDown` first and then honoured `defaultPrevented`; a
     fallthrough listener would merge AFTER this handler and lose that ordering, so it is pulled
     off `attrs` and invoked by hand (and excluded from the passthrough so it cannot fire twice). */
  (attrs.onKeydown as ((e: KeyboardEvent) => void) | undefined)?.(event);
  if (event.defaultPrevented) return;
  /* A combobox opens on the arrow keys; `setOpen` ignores the request while the picker is read-only or disabled. */
  if (!ctx.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault();
    ctx.setOpen(true);
    return;
  }
  /* Only intercept when closed — open delegates to the ListboxPicker. A consumed char (incl. Space
     while a buffer is active) must not also toggle the popover open via the button. */
  if (!ctx.open && triggerTypeahead.onKeyDown(event)) {
    event.preventDefault();
  }
}

const showClear = computed(
  () => ctx.isClearable && ctx.hasSelection && !ctx.isLoading && !ctx.isDisabled && !skeleton.isSkeleton.value,
);

const sizeKey = computed<SelectPickerSize>(() => props.size ?? 'md');
const iconClass = computed(() => TriggerIconClasses[sizeKey.value]);
const clearBoxClass = computed(() => TriggerClearBoxClasses[sizeKey.value]);
const dividerClass = computed(() => TriggerDividerClasses[sizeKey.value]);
const clearOffsetClass = computed(() => TriggerClearOffsetClasses[sizeKey.value]);

/* Names the trigger from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (!ariaLabel.value ? ctx.labelId : undefined));

/* A read-only trigger is not disabled: it keeps its focus, and `aria-readonly` — valid because the trigger is a
   `combobox`, not a `button` — names its state. */
const isHardDisabled = computed(() => ctx.isDisabled && !ctx.isReadOnly);

const dataState = computed(() => triggerDataState(ctx.open, ctx.isLoading, isHardDisabled.value, ctx.isInvalid));

const chevronClass = computed(() =>
  cn(iconClass.value, 'text-muted-foreground transition-transform', ctx.open && 'rotate-180'),
);

const spinnerClass = computed(() => cn(iconClass.value, 'animate-spin text-subtle-foreground'));

const clearButtonClass = computed(() =>
  cn(
    /* `min-h/min-w` floor the hit target at 24px (WCAG 2.2 SC 2.5.8) while the glyph box
       (`clearBoxClass`) stays visually small. */
    'absolute top-1/2 grid min-h-6 min-w-6 -translate-y-1/2 place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    clearBoxClass.value,
    clearOffsetClass.value,
  ),
);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'onKeydown']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const buttonClass = computed(() =>
  cn(
    selectTriggerVariants({ size: props.size, state: triggerState.value }),
    attrs.class as ClassValue,
    skeleton.boxClass.value,
  ),
);

/* The wrapper carries the width: the clear button is positioned against its right edge, so the button fills it. */
const wrapperClass = computed(() =>
  cn('relative inline-flex', props.width === undefined && props.isFullWidth ? 'w-full' : 'max-w-full'),
);
const wrapperStyle = computed(() =>
  props.width === undefined ? undefined : { width: CssExtensions.toCss(props.width) },
);

const root = useTemplateRef<HTMLButtonElement>('root');

/** The rendered `<button>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <span
    :class="wrapperClass"
    :style="wrapperStyle"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :inert="skeleton.isSkeleton.value || undefined"
  >
    <!--
      Always-mounted polite live region — swapping content (empty ↔ label) makes SRs announce
      the loading transition. `aria-busy` on the button alone isn't announced.
    -->
    <Announce>{{ ctx.isLoading ? ctx.loadingLabel : '' }}</Announce>
    <PopoverTrigger as-child>
      <button
        ref="root"
        type="button"
        role="combobox"
        :id="ctx.fieldId"
        :disabled="isHardDisabled || ctx.isLoading"
        :aria-readonly="ctx.isReadOnly || undefined"
        :aria-busy="ctx.isLoading || undefined"
        aria-haspopup="listbox"
        :aria-controls="ctx.listboxId"
        :aria-activedescendant="ctx.open ? (ctx.activeDescendant ?? undefined) : undefined"
        :aria-invalid="triggerState === 'invalid' || undefined"
        :aria-labelledby="labelledBy"
        :aria-describedby="ctx.describedBy"
        :data-state="dataState"
        :class="buttonClass"
        v-bind="passthroughAttrs"
        @keydown="handleTriggerKeyDown"
      >
        <slot><SelectPickerValue /></slot>
        <span class="ml-auto flex shrink-0 items-center gap-1.5">
          <template v-if="showClear">
            <!-- Reserves the slot the overlaid clear button sits on. -->
            <span aria-hidden="true" :class="clearBoxClass" />
            <!-- Separates the clear button from the chevron — `foreground/20` always contrasts. -->
            <span aria-hidden="true" :class="cn('w-px bg-foreground/20', dividerClass)" />
          </template>
          <LoaderIcon v-if="ctx.isLoading" :class="spinnerClass" />
          <ChevronDownIcon v-else :class="chevronClass" />
        </span>
      </button>
    </PopoverTrigger>
    <button
      v-if="showClear"
      type="button"
      :aria-label="ctx.clearLabel"
      :class="clearButtonClass"
      @click="ctx.onClear()"
    >
      <ClearIcon :class="iconClass" />
    </button>
  </span>
</template>
