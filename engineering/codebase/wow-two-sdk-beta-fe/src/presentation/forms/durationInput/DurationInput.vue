<script lang="ts">
import type { InputSize } from '../InputStyles';

/** Names a unit a duration field can edit. */
export const DurationUnit = {
  /** Whole days of 24 hours. */
  Days: 'days',
  /** Hours. */
  Hours: 'hours',
  /** Minutes. */
  Minutes: 'minutes',
  /** Seconds. */
  Seconds: 'seconds',
} as const;
export type DurationUnit = (typeof DurationUnit)[keyof typeof DurationUnit];

/** Defines props for the segmented duration field. */
export interface DurationInputProps {
  /** The duration, controlled. The `v-model` binding target; `null` is empty. */
  readonly modelValue?: Temporal.Duration | null;

  /** The initial duration when uncontrolled. */
  readonly defaultValue?: Temporal.Duration | null;

  /** The units to edit, one segment each, ordered largest first. Default hours and minutes. */
  readonly units?: ReadonlyArray<DurationUnit>;

  /** The control size. */
  readonly size?: InputSize;

  /** The first segment's id. Auto-filled from `Field` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value submitted. Falls back to the surrounding field's state. */
  readonly isReadOnly?: boolean;

  /** The invalid state. Falls back to the surrounding field's state. */
  readonly isInvalid?: boolean;

  /** The hidden input name; the duration ships as ISO 8601 (`PT1H30M`). */
  readonly name?: string;
}

/** @internal Every unit, largest first. */
const UnitOrder: ReadonlyArray<DurationUnit> = ['days', 'hours', 'minutes', 'seconds'];

/** @internal Seconds per unit. */
const UnitSeconds: Readonly<Record<DurationUnit, number>> = { days: 86_400, hours: 3_600, minutes: 60, seconds: 1 };

/** @internal The singular `Intl` unit id per unit. */
const IntlUnit: Readonly<Record<DurationUnit, string>> = {
  days: 'day',
  hours: 'hour',
  minutes: 'minute',
  seconds: 'second',
};

/** @internal The most digits a segment accepts. */
const MaxDigits = 6;

/** @internal The duration's length in seconds, counting days as 24 hours and ignoring calendar units. */
function totalSeconds(duration: Temporal.Duration): number {
  return UnitOrder.reduce((sum, unit) => sum + duration[unit] * UnitSeconds[unit], 0);
}

/** @internal Splits a length across the shown units — the largest takes any size, smaller ones roll over. */
function splitSeconds(total: number, units: ReadonlyArray<DurationUnit>): Record<DurationUnit, number> {
  const parts: Record<DurationUnit, number> = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  let remaining = Math.max(0, Math.floor(total));
  for (const unit of units) {
    parts[unit] = Math.floor(remaining / UnitSeconds[unit]);
    remaining -= parts[unit] * UnitSeconds[unit];
  }
  return parts;
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Temporal } from 'temporal-polyfill';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants, InputState } from '../InputStyles';
import { useNativeFormReset } from '../UseNativeFormReset';

/**
 * Renders a duration as one numeric segment per unit — `1 h 30 m` — balanced on blur and stepped with the
 * arrow keys.
 */
defineOptions({ name: 'DurationInput', inheritAttrs: false });

const props = withDefaults(defineProps<DurationInputProps>(), {
  modelValue: undefined,
  defaultValue: null,
  units: () => [DurationUnit.Hours, DurationUnit.Minutes],
  size: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader types or steps a segment — the `v-model` half, always balanced. */
  'update:modelValue': [duration: Temporal.Duration | null];
}>();

const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const invalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);

/** The shown units — known ones only, deduplicated, largest first. */
const shownUnits = computed<ReadonlyArray<DurationUnit>>(() => {
  const picked = UnitOrder.filter((unit) => props.units.includes(unit));
  return picked.length > 0 ? picked : [DurationUnit.Hours, DurationUnit.Minutes];
});

const controlled = useControlled<Temporal.Duration | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});
const value = controlled.value;

/** Builds a balanced duration over the shown units from a length in seconds. */
function durationOf(total: number): Temporal.Duration {
  const parts = splitSeconds(total, shownUnits.value);
  return Temporal.Duration.from(Object.fromEntries(shownUnits.value.map((unit) => [unit, parts[unit]])));
}

/** The segment texts for a duration — empty for `null`. */
function draftsOf(duration: Temporal.Duration | null): Record<DurationUnit, string> {
  const parts = splitSeconds(duration ? totalSeconds(duration) : 0, shownUnits.value);
  return Object.fromEntries(UnitOrder.map((unit) => [unit, duration ? String(parts[unit]) : ''])) as Record<
    DurationUnit,
    string
  >;
}

/** The reader's in-progress segment texts; they resync from the value on blur and on outside changes. */
const drafts = ref(draftsOf(value.value));

/** The length the drafts spell, or `null` when every shown segment is empty. */
function draftSeconds(): number | null {
  const texts = shownUnits.value.map((unit) => drafts.value[unit]);
  if (texts.every((text) => text === '')) return null;
  return shownUnits.value.reduce((sum, unit) => sum + Number(drafts.value[unit] || 0) * UnitSeconds[unit], 0);
}

function resync(): void {
  drafts.value = draftsOf(value.value);
}

/* An outside change resyncs the segments unless they already spell that length — so a typed `90` minutes
   stays on screen until blur instead of jumping to `1 h 30 m` mid-keystroke. */
watch([value, shownUnits], () => {
  const next = value.value;
  if ((next === null ? null : totalSeconds(next)) !== draftSeconds()) resync();
});

function commit(total: number | null): void {
  controlled.setValue(total === null ? null : durationOf(total));
}

function onInput(unit: DurationUnit, event: Event): void {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, '').slice(0, MaxDigits);
  if (input.value !== digits) input.value = digits;
  drafts.value = { ...drafts.value, [unit]: digits };
  const total = draftSeconds();
  const current = value.value === null ? null : totalSeconds(value.value);
  if (total !== current) commit(total);
}

function onKeydown(unit: DurationUnit, event: KeyboardEvent): void {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  if (disabled.value || readOnly.value) return;
  const step = (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1) * UnitSeconds[unit];
  const current = value.value === null ? 0 : totalSeconds(value.value);
  const next = Math.max(0, current + step);
  if (value.value === null || next !== current) commit(next);
  resync();
}

/** The narrow unit suffix (`h`) and the long unit name (`hours`), both localized. */
function unitText(unit: DurationUnit, display: 'narrow' | 'long'): string {
  const parts = new Intl.NumberFormat(locale.locale.value, {
    style: 'unit',
    unit: IntlUnit[unit],
    unitDisplay: display,
  }).formatToParts(display === 'long' ? 2 : 0);
  return parts.find((part) => part.type === 'unit')?.value ?? unit;
}

const hiddenValue = computed(() => value.value?.toString() ?? '');

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);
const groupLabelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const firstId = computed(() => props.id ?? field?.id);
const formId = computed(() => (typeof attrs.form === 'string' ? attrs.form : undefined));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'form', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const groupClass = computed(() =>
  cn(
    inputBaseVariants({ size: props.size, state: invalid.value ? InputState.Invalid : InputState.Default }),
    'items-center gap-1 focus-within:ring-2 focus-within:ring-ring',
    invalid.value && 'focus-within:ring-destructive-soft-foreground',
    disabled.value && 'cursor-not-allowed opacity-60',
    readOnly.value && 'bg-muted',
    attrs.class as ClassValue,
  ),
);

const SegmentClass =
  'min-w-[2ch] bg-transparent text-end tabular-nums outline-hidden placeholder:text-subtle-foreground ' +
  'disabled:cursor-not-allowed';

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
  resync();
});
</script>

<template>
  <div
    role="group"
    :aria-label="ariaLabel"
    :aria-labelledby="groupLabelledBy"
    :aria-describedby="field?.describedBy"
    :aria-disabled="disabled || undefined"
    :class="groupClass"
    v-bind="passthroughAttrs"
  >
    <template v-for="(unit, position) in shownUnits" :key="unit">
      <input
        :id="position === 0 ? firstId : undefined"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        :spellcheck="false"
        :aria-label="unitText(unit, 'long')"
        :aria-invalid="invalid || undefined"
        :data-unit="unit"
        :value="drafts[unit]"
        placeholder="0"
        :disabled="disabled"
        :readonly="readOnly"
        :class="SegmentClass"
        :style="{ width: `${Math.max(2, drafts[unit].length)}ch` }"
        @input="onInput(unit, $event)"
        @keydown="onKeydown(unit, $event)"
        @blur="resync"
      />
      <span class="me-1 text-muted-foreground last:me-0" aria-hidden="true">{{ unitText(unit, 'narrow') }}</span>
    </template>
    <input
      v-if="props.name"
      type="hidden"
      :disabled="disabled"
      :form="formId"
      :name="props.name"
      :value="hiddenValue"
    />
    <input ref="formResetAnchor" type="hidden" :form="formId" aria-hidden="true" />
  </div>
</template>
