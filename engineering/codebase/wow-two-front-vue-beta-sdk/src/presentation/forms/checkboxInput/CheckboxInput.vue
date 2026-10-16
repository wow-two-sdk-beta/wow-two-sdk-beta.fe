<script lang="ts">
import type { ColorProp, ColorTone, SizePreset, SizeUnion } from '../../../foundation/styles';
import type { CheckboxInputVariant, CheckboxInputVariants } from './CheckboxInput.variants';

/* CheckboxInput supports the 5-preset core (skips `2xl` — outsized for a form control). */
export type CheckboxInputSizePreset = Extract<SizePreset, 'xs' | 'sm' | 'md' | 'lg' | 'xl'>;

export interface CheckboxInputProps {
  /**
   * The size — preset (`xs|sm|md|lg|xl`) → box + icon scale · number/string → square inline ·
   * object → explicit dims.
   */
  readonly size?: SizeUnion<CheckboxInputSizePreset>;

  /** The visual surface style. */
  readonly variant?: CheckboxInputVariant;

  /** The semantic tone palette. */
  readonly tone?: ColorTone;

  /** The tristate visual state — input stays unchecked but renders as a dash with the same checked-state styling. */
  readonly isIndeterminate?: boolean;

  /** The color override (string seed or slot object) — replaces the active `tone`'s theme tokens locally. */
  readonly color?: ColorProp;

  /** The checked state, controlled. The `v-model` binding target. */
  readonly modelValue?: boolean;

  /** The initial checked state when uncontrolled. */
  readonly defaultValue?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;

  /** Draws the box as its own placeholder, inert; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}

const ComponentName = 'CheckboxInput';

/* Outer wrapper box dim per preset. */
const BoxSizeClass: Record<CheckboxInputSizePreset, string> = {
  xs: 'h-3.5 w-3.5', // 14px — dense / mobile-tight (consumer must ensure ≥24px hit target via wrapping label)
  sm: 'h-4 w-4', // 16px
  md: 'h-5 w-5', // 20px (default)
  lg: 'h-6 w-6', // 24px (WCAG-compliant standalone)
  xl: 'h-7 w-7', // 28px (emphasis / a11y-first)
};

/* Inner icon dim per preset — scales proportionally to box. */
const IconSizeClass: Record<CheckboxInputSizePreset, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
  xl: 'h-5 w-5',
};

/* Fallback icon dim when raw/object size used — middle of scale. */
const DefaultIconClass = 'h-3 w-3';

/* When indeterminate=true, apply the compound's checked classes regardless of peer-checked state. */
const IndeterminateCheckedClass: Record<
  NonNullable<CheckboxInputVariants['variant']>,
  Record<NonNullable<CheckboxInputVariants['tone']>, string>
> = {
  solid: {
    primary: 'bg-primary border-primary text-primary-foreground',
    neutral: 'bg-foreground border-foreground text-background',
    danger: 'bg-destructive border-destructive text-destructive-foreground',
    success: 'bg-success border-success text-success-foreground',
    warning: 'bg-warning border-warning text-warning-foreground',
  },
  soft: {
    primary: 'bg-primary text-primary-foreground',
    neutral: 'bg-foreground text-background',
    danger: 'bg-destructive text-destructive-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
  },
  outline: {
    primary: 'bg-primary text-primary-foreground',
    neutral: 'bg-foreground text-background',
    danger: 'bg-destructive text-destructive-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
  },
  ghost: {
    primary: 'bg-primary/10 text-primary',
    neutral: 'bg-muted text-foreground',
    danger: 'bg-destructive/10 text-destructive',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  },
  /* Glass family keeps the dark glass bg in the indeterminate state, matching checked. The Minus
     icon renders unconditionally; text-white from the variant base is what makes it visible. */
  glass: {
    primary: 'text-white',
    neutral: 'text-white',
    danger: 'text-white',
    success: 'text-white',
    warning: 'text-white',
  },
  'glass-surface': {
    primary: 'text-white border-white/80',
    neutral: 'text-white border-white/80',
    danger: 'text-white border-white/80',
    success: 'text-white border-white/80',
    warning: 'text-white border-white/80',
  },
};
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, nextTick, useAttrs, useTemplateRef, watch, type StyleValue } from 'vue';
import type { ClassValue } from 'clsx';
import { Check, Minus } from 'lucide-vue-next';
import { cn, ColorExtensions, CssExtensions, ColorTone as ColorToneValue } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { checkboxVariants, CheckboxInputVariant as CheckboxInputVariantValue } from './CheckboxInput.variants';

/** Renders a native checkbox behind a custom visual — 6 variants × 5 tones, plus an indeterminate dash. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: ComponentName, inheritAttrs: false });

const props = withDefaults(defineProps<CheckboxInputProps>(), {
  size: 'md',
  variant: CheckboxInputVariantValue.Solid,
  tone: ColorToneValue.Primary,
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context or to a meaningful tri-state, and Vue casts an absent `boolean` prop to `false`. */
  isIndeterminate: undefined,
  modelValue: undefined,
  defaultValue: undefined,
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
  isSkeleton: undefined,
});

const emit = defineEmits<{
  /** Fires when the user ticks or unticks the box — the `v-model` half. */
  'update:modelValue': [checked: boolean];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<boolean>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? false,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const isChecked = controlled.value;

function onChange(event: Event): void {
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) {
    (event.target as HTMLInputElement).checked = isChecked.value;
    return;
  }
  const box = event.target as HTMLInputElement;
  controlled.setValue(box.checked);
  /* A controlled owner that declines the change keeps its prop, and Vue skips an unchanged binding — so the
     native box would keep the reader's toggle. Re-syncs it once the owner's update has flushed. */
  void nextTick(() => {
    box.checked = isChecked.value;
  });
}

const input = useTemplateRef<HTMLInputElement>('input');

/*
 * Syncs the native `indeterminate` property — it has no attribute, so it is only reachable
 * imperatively. `flush: 'post'` runs after the DOM patch; `immediate` is safe here ONLY
 * because the body touches the template ref rather than a browser global, and the ref is
 * `null` on the server, where the guard below short-circuits.
 */
watch(
  [input, () => props.isIndeterminate],
  ([node, indeterminate]) => {
    if (node) node.indeterminate = Boolean(indeterminate);
  },
  { immediate: true, flush: 'post' },
);

/* Parse union-typed `size` — preset routes to box+icon class lookup, raw/object routes to inline dims. */
const CheckboxInputSizePresets: ReadonlySet<string> = new Set<CheckboxInputSizePreset>(['xs', 'sm', 'md', 'lg', 'xl']);

const parsedSize = computed(() =>
  CssExtensions.parseSizeUnion<CheckboxInputSizePreset>(props.size, CheckboxInputSizePresets),
);

const boxClass = computed(() => (parsedSize.value.preset ? BoxSizeClass[parsedSize.value.preset] : undefined));
const iconClass = computed(() => (parsedSize.value.preset ? IconSizeClass[parsedSize.value.preset] : DefaultIconClass));

/* Per-instance color override → sets CSS vars on wrapper; the visual span inherits via cascade. */
const composedStyle = computed<StyleValue | undefined>(() => {
  const boxStyle = parsedSize.value.box ? CssExtensions.resolveBoxSize(parsedSize.value.box) : undefined;
  const colorStyle = ColorExtensions.toneColorOverride(props.color, props.tone);
  return colorStyle || boxStyle ? { ...colorStyle, ...boxStyle } : undefined;
});

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? ctx?.isReadOnly ?? false);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const ariaChecked = computed(() => (props.isIndeterminate ? 'mixed' : undefined));
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'checked']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('relative inline-flex shrink-0', boxClass.value, attrs.class as ClassValue));

/* In skeleton mode the box keeps its size, radius and border width as the placeholder; the tick hides. */
const skeleton = useSkeletonState(() => props.isSkeleton);

const visualClass = computed(() =>
  skeleton.isSkeleton.value
    ? cn('pointer-events-none grid h-full w-full place-items-center rounded-sm border', skeleton.boxClass.value)
    : visualStateClass.value,
);

const visualStateClass = computed(() =>
  cn(
    checkboxVariants({ variant: props.variant, tone: props.tone }),
    props.isIndeterminate
      ? IndeterminateCheckedClass[props.variant][props.tone]
      : /* Opacity gate lives on this span (a peer sibling of the input) — the child selector
           targets the SVG, since `peer-checked:` cannot reach descendants. */
        '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
  ),
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(input, controlled.reset, () => {
  if (input.value) input.value.checked = Boolean(isChecked.value);
});

defineExpose({ el: input });
</script>

<template>
  <span
    :class="wrapperClass"
    :style="composedStyle"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :inert="skeleton.isSkeleton.value || undefined"
  >
    <input
      ref="input"
      type="checkbox"
      :id="inputId"
      :disabled="finalDisabled"
      :required="finalRequired"
      :checked="isChecked"
      :aria-checked="ariaChecked"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      class="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      v-bind="passthroughAttrs"
      @change="onChange"
      @click="finalReadOnly && $event.preventDefault()"
      :aria-readonly="finalReadOnly || undefined"
    />
    <span aria-hidden="true" :class="visualClass">
      <Minus v-if="isIndeterminate" :class="iconClass" />
      <Check v-else :class="iconClass" />
    </span>
  </span>
</template>
