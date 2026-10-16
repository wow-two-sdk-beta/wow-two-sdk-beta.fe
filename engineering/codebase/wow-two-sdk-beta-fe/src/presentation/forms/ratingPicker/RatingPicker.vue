<script lang="ts">
import type { IconAdapter } from '../../../foundation/icons';
import type { ColorTone } from '../../../foundation/styles';

/** Defines the value granularity a rating accepts. */
export const RatingStep = {
  /** Refers to whole marks only — 1, 2, 3. */
  Whole: 1,
  /** Refers to half marks — 0.5, 1, 1.5. */
  Half: 0.5,
} as const;

export type RatingStep = (typeof RatingStep)[keyof typeof RatingStep];

/** Defines the icon size scale of a rating. */
export const RatingPickerSize = {
  /** Refers to 16px marks. */
  Sm: 'sm',
  /** Refers to 20px marks. */
  Md: 'md',
  /** Refers to 28px marks. */
  Lg: 'lg',
} as const;

export type RatingPickerSize = (typeof RatingPickerSize)[keyof typeof RatingPickerSize];

/** Defines props for the star-rating picker. */
export interface RatingPickerProps {
  /** The rating, controlled. The `v-model` binding target; `null` means no rating. */
  readonly modelValue?: number | null;

  /** The initial rating when uncontrolled. Default `null`. */
  readonly defaultValue?: number | null;

  /** The number of marks, and the highest rating. Default 5; rounded and kept within 1–20. */
  readonly max?: number;

  /** The value granularity. Default `1`; `0.5` splits every mark into two halves. */
  readonly step?: RatingStep;

  /** Whether pressing the current rating again, Backspace or Delete clears it. Default `true`. */
  readonly isClearable?: boolean;

  /** The mark size. Default `md`. */
  readonly size?: RatingPickerSize;

  /** The fill tone. Default `warning`. */
  readonly tone?: ColorTone;

  /** The mark icon. Default a star. */
  readonly icon?: IconAdapter;

  /** The accessible text for one rating value. Default `"{value} of {max}"`, localized. */
  readonly formatValue?: (value: number, max: number) => string;

  /** The shared radio `name`, submitted with the form. Generated when omitted. */
  readonly name?: string;

  /** The group's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value in form submission. Falls back to the form control. */
  readonly isReadOnly?: boolean;

  /** The required state. Falls back to the surrounding form control's `isRequired`. */
  readonly isRequired?: boolean;
}

/** @internal The icon pixel size per mark size. */
const IconSize: Record<RatingPickerSize, number> = { sm: 16, md: 20, lg: 28 };

/** @internal The fill color per tone. */
const ToneClass: Record<ColorTone, string> = {
  primary: 'text-primary',
  neutral: 'text-foreground',
  danger: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
};

/** @internal The bounds `max` is kept within. */
const MaxBounds = { min: 1, max: 20 } as const;
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Star } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { useNativeFormReset } from '../UseNativeFormReset';

/** Renders a row of marks that picks one rating from 1 to `max`, in whole or half steps. */
defineOptions({ name: 'RatingPicker', inheritAttrs: false });

const props = withDefaults(defineProps<RatingPickerProps>(), {
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and each flag falls back to
     the form control context, which Vue's `boolean` cast to `false` would shadow. */
  modelValue: undefined,
  defaultValue: null,
  max: 5,
  step: RatingStep.Whole,
  isClearable: true,
  size: RatingPickerSize.Md,
  tone: 'warning',
  icon: undefined,
  formatValue: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isRequired: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks or clears a rating — the `v-model` half. */
  'update:modelValue': [value: number | null];
}>();

const attrs = useAttrs();
const ctx = useFormControl();
const locale = useLocale();
const generatedName = useId();

const controlled = useControlled<number | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const current = controlled.value;

/** The rating the pointer is previewing, or `null` when it is not over a mark. */
const preview = shallowRef<number | null>(null);

const markCount = computed(() => {
  const rounded = Math.round(Number.isFinite(props.max) ? props.max : MaxBounds.min);
  return Math.min(MaxBounds.max, Math.max(MaxBounds.min, rounded));
});

const disabled = computed(() => props.isDisabled ?? ctx?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly ?? false);
const required = computed(() => props.isRequired ?? ctx?.isRequired ?? false);
const groupName = computed(() => props.name ?? generatedName);
const groupId = computed(() => props.id ?? ctx?.id);
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);
const labelledBy = computed(() => (ariaLabel.value ? undefined : ctx?.labelledBy));

/** The rating the marks draw — the preview while the pointer is over them, else the committed one. */
const shownValue = computed(() => preview.value ?? current.value ?? 0);

/** The accessible text for the committed rating, used by the read-only image. */
const summary = computed(() =>
  current.value === null ? locale.t('RatingPicker.noRating', undefined, 'No rating') : valueText(current.value),
);

const iconSize = computed(() => IconSize[props.size] ?? IconSize.md);
const markIcon = computed<IconAdapter>(() => props.icon ?? Star);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn('inline-flex items-center gap-0.5', disabled.value && 'cursor-not-allowed opacity-50', attrs.class as ClassValue),
);

/** Resolves the accessible text for one value. */
function valueText(value: number): string {
  if (props.formatValue) return props.formatValue(value, markCount.value);
  return locale.t('RatingPicker.valueText', { value, max: markCount.value }, '{value} of {max}');
}

/** The filled share of one mark, 0 to 1, for the shown value. */
function fillOf(mark: number): number {
  return Math.min(1, Math.max(0, shownValue.value - (mark - 1)));
}

/** The values a mark's hit areas select — one, or two in half steps. */
function valuesOf(mark: number): number[] {
  return props.step === RatingStep.Half ? [mark - 0.5, mark] : [mark];
}

/** Whether edits are blocked. */
function isInactive(): boolean {
  return disabled.value || readOnly.value;
}

/** Commits a picked value. */
function pick(value: number): void {
  if (isInactive()) return;
  controlled.setValue(value);
}

function handleChange(event: Event, value: number): void {
  if (isInactive()) {
    (event.target as HTMLInputElement).checked = current.value === value;
    return;
  }
  pick(value);
}

/** Clears the rating when a pointer presses the value that is already picked. */
function handleClick(event: MouseEvent, value: number): void {
  if (isInactive() || !props.isClearable || event.detail === 0) return;
  if (current.value === value) {
    event.preventDefault();
    controlled.setValue(null);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (isInactive() || !props.isClearable || event.isComposing) return;
  if (event.key !== 'Backspace' && event.key !== 'Delete') return;
  event.preventDefault();
  controlled.setValue(null);
}

/** Previews the value under a mouse pointer. */
function handlePointerMove(event: PointerEvent, value: number): void {
  if (event.pointerType !== 'mouse' || isInactive()) return;
  preview.value = value;
}

function handlePointerLeave(): void {
  preview.value = null;
}

const root = useTemplateRef<HTMLDivElement>('root');
const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

defineExpose({ el: root });
</script>

<template>
  <div
    ref="root"
    :key="formResetRevision"
    :id="groupId"
    :role="readOnly ? 'img' : 'radiogroup'"
    :aria-label="readOnly ? (ariaLabel ?? summary) : ariaLabel"
    :aria-labelledby="readOnly ? undefined : labelledBy"
    :aria-describedby="ctx?.describedBy"
    :aria-invalid="(!readOnly && ctx?.isInvalid) || undefined"
    :aria-required="(!readOnly && required) || undefined"
    :aria-disabled="disabled || undefined"
    :data-disabled="disabled ? '' : undefined"
    :data-readonly="readOnly ? '' : undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @pointerleave="handlePointerLeave"
  >
    <span
      v-for="mark in markCount"
      :key="mark"
      :class="
        cn(
          'relative inline-flex rounded-sm',
          'has-[:focus-visible]:outline-hidden has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        )
      "
      :data-fill="fillOf(mark) === 1 ? 'full' : fillOf(mark) > 0 ? 'partial' : 'empty'"
    >
      <Icon :icon="markIcon" :size="iconSize" class="text-muted-foreground/40" />
      <span
        class="pointer-events-none absolute inset-y-0 start-0 overflow-hidden"
        :style="{ width: `${fillOf(mark) * 100}%` }"
      >
        <Icon :icon="markIcon" :size="iconSize" :class="cn('fill-current', ToneClass[tone] ?? ToneClass.warning)" />
      </span>
      <template v-if="!readOnly">
        <label
          v-for="(value, part) in valuesOf(mark)"
          :key="value"
          :class="
            cn(
              'absolute inset-y-0',
              valuesOf(mark).length === 1 ? 'inset-x-0' : part === 0 ? 'start-0 w-1/2' : 'end-0 w-1/2',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )
          "
          @pointermove="handlePointerMove($event, value)"
        >
          <input
            type="radio"
            class="sr-only"
            :name="groupName"
            :value="value"
            :checked="current === value"
            :disabled="disabled"
            :required="required"
            :aria-label="valueText(value)"
            :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
            @change="handleChange($event, value)"
            @click="handleClick($event, value)"
            @keydown="handleKeydown"
          />
        </label>
      </template>
    </span>
    <input
      v-if="readOnly && name && current !== null"
      type="hidden"
      :name="name"
      :value="current"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
