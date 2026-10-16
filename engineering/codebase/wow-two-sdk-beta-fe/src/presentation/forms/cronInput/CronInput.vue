<script lang="ts">
import type { InputSize, InputState } from '../InputStyles';

export interface CronInputProps {
  /** The control size. */
  readonly size?: InputSize;

  /** The validity surface. */
  readonly state?: InputState;

  /** The cron string, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial cron string when uncontrolled. Defaults to the every-5-minutes expression. */
  readonly defaultValue?: string;

  /** The empty-state placeholder. */
  readonly placeholder?: string;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** Whether the human-readable readout renders under the input. Default `true`. */
  readonly hasPreview?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;

  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;

  /** The hidden input name; the hidden input emits the cron string. */
  readonly name?: string;
}
/* React also inherited `Omit<InputBaseVariants, 'size' | 'state'>` — the `border` / `ring`
   axes — but never forwarded them to `inputBaseVariants`, so they were dead props that landed
   on the DOM as unknown attributes. Only the two axes the original consumed are declared here. */

/* Index 7 is Sunday again: POSIX cron accepts both 0 and 7 for it. */
const WeekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MonthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Defines the parsed form of a single cron field (one of the five positions). */
export const CronFieldKind = {
  /** Refers to `*` — every value. */
  Every: 'every',
  /** Refers to a single specific value (`N`). */
  Specific: 'specific',
  /** Refers to an inclusive range (`N-M`). */
  Range: 'range',
  /** Refers to a comma list (`N,M,O`). */
  List: 'list',
  /** Refers to a step expression such as `* / N`. */
  Step: 'step',
  /** Refers to an unparseable / out-of-bounds field. */
  Invalid: 'invalid',
} as const;

export type CronFieldKind = (typeof CronFieldKind)[keyof typeof CronFieldKind];

interface CronField {
  raw: string;
  kind: CronFieldKind;
  value?: number | ReadonlyArray<number>;
  step?: number;
  range?: [number, number];
}

function parseField(raw: string, min: number, max: number): CronField {
  if (raw === '*') return { raw, kind: CronFieldKind.Every };
  // Step: "*/N" or "from-to/N" — only support "*/N" first-gen.
  if (/^\*\/(\d+)$/.test(raw)) {
    const step = Number(raw.slice(2));
    if (step < 1 || step > max) return { raw, kind: CronFieldKind.Invalid };
    return { raw, kind: CronFieldKind.Step, step };
  }
  // Range: "N-M".
  if (/^(\d+)-(\d+)$/.test(raw)) {
    const [a, b] = raw.split('-').map(Number);
    if (a == null || b == null || a < min || b > max || a > b) return { raw, kind: CronFieldKind.Invalid };
    return { raw, kind: CronFieldKind.Range, range: [a, b] };
  }
  // List: "N,M,O".
  if (/^\d+(,\d+)+$/.test(raw)) {
    const parts = raw.split(',').map(Number);
    if (parts.some((p) => p < min || p > max)) return { raw, kind: CronFieldKind.Invalid };
    return { raw, kind: CronFieldKind.List, value: parts };
  }
  // Specific number.
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n < min || n > max) return { raw, kind: CronFieldKind.Invalid };
    return { raw, kind: CronFieldKind.Specific, value: n };
  }
  return { raw, kind: CronFieldKind.Invalid };
}

function describeField(field: CronField, names?: ReadonlyArray<string>, unit = '', plural = ''): string {
  if (field.kind === CronFieldKind.Every) return '*';
  if (field.kind === CronFieldKind.Invalid) return '?';
  if (field.kind === CronFieldKind.Step && field.step != null) return `every ${field.step} ${plural || unit + 's'}`;
  if (field.kind === CronFieldKind.Range && field.range) {
    const [a, b] = field.range;
    const aLabel = names?.[a] ?? a;
    const bLabel = names?.[b] ?? b;
    return `${aLabel} through ${bLabel}`;
  }
  if (field.kind === CronFieldKind.List && Array.isArray(field.value)) {
    return field.value.map((v: number) => names?.[v] ?? v).join(', ');
  }
  if (field.kind === CronFieldKind.Specific && typeof field.value === 'number') {
    return String(names?.[field.value] ?? field.value);
  }
  return field.raw;
}

function parseCron(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 5) return 'Cron expressions must have 5 fields (min hour dom month dow).';
  const [minRaw, hourRaw, domRaw, monRaw, dowRaw] = parts as [string, string, string, string, string];
  const minute = parseField(minRaw, 0, 59);
  const hour = parseField(hourRaw, 0, 23);
  const dom = parseField(domRaw, 1, 31);
  const month = parseField(monRaw, 1, 12);
  const dow = parseField(dowRaw, 0, 7);

  if ([minute, hour, dom, month, dow].some((f) => f.kind === CronFieldKind.Invalid)) {
    return 'Invalid cron expression.';
  }

  // Common-case readouts.
  if (
    minute.kind === CronFieldKind.Step &&
    hour.kind === CronFieldKind.Every &&
    dom.kind === CronFieldKind.Every &&
    month.kind === CronFieldKind.Every &&
    dow.kind === CronFieldKind.Every
  ) {
    return `Every ${minute.step} minutes`;
  }
  if (
    minute.kind === CronFieldKind.Every &&
    hour.kind === CronFieldKind.Step &&
    dom.kind === CronFieldKind.Every &&
    month.kind === CronFieldKind.Every &&
    dow.kind === CronFieldKind.Every
  ) {
    return `Every ${hour.step} hours`;
  }
  if (
    minute.kind === CronFieldKind.Specific &&
    hour.kind === CronFieldKind.Specific &&
    dom.kind === CronFieldKind.Every &&
    month.kind === CronFieldKind.Every &&
    dow.kind === CronFieldKind.Every
  ) {
    return `Every day at ${String(hour.value).padStart(2, '0')}:${String(minute.value).padStart(2, '0')}`;
  }
  if (
    minute.kind === CronFieldKind.Specific &&
    hour.kind === CronFieldKind.Specific &&
    dom.kind === CronFieldKind.Every &&
    month.kind === CronFieldKind.Every &&
    (dow.kind === CronFieldKind.List || dow.kind === CronFieldKind.Specific || dow.kind === CronFieldKind.Range)
  ) {
    return `At ${String(hour.value).padStart(2, '0')}:${String(minute.value).padStart(2, '0')} on ${describeField(dow, WeekdayNames)}`;
  }
  if (
    minute.kind === CronFieldKind.Every &&
    hour.kind === CronFieldKind.Every &&
    dom.kind === CronFieldKind.Every &&
    month.kind === CronFieldKind.Every &&
    dow.kind === CronFieldKind.Every
  ) {
    return 'Every minute';
  }
  // Fallback — describe each field.
  const parts2 = [];
  if (minute.kind !== CronFieldKind.Every) parts2.push(`minute: ${describeField(minute, undefined, 'minute')}`);
  if (hour.kind !== CronFieldKind.Every) parts2.push(`hour: ${describeField(hour, undefined, 'hour')}`);
  if (dom.kind !== CronFieldKind.Every) parts2.push(`day: ${describeField(dom)}`);
  if (month.kind !== CronFieldKind.Every) parts2.push(`month: ${describeField(month, ['', ...MonthNames])}`);
  if (dow.kind !== CronFieldKind.Every) parts2.push(`weekday: ${describeField(dow, WeekdayNames)}`);
  return parts2.length === 0 ? 'Every minute' : parts2.join(' · ');
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

/**
 * Renders a cron-string input with a live plain-English preview of when the expression fires.
 * Supports asterisk, N, step (asterisk-slash-N), N-M, N,M,O per field. Quartz extensions
 * (?, L, W, #) deferred.
 *
 * Form-aware: inside a `Field`/`form.Field` the inner input takes the context
 * id (a label's `for` focuses it directly) + `aria-describedby`, the
 * disabled/read-only/required flags, and `aria-invalid`/invalid surface.
 */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call, and so the rest
   of the attrs land on the inner `<input>` rather than the wrapper. */
defineOptions({ name: 'CronInput', inheritAttrs: false });

const props = withDefaults(defineProps<CronInputProps>(), {
  placeholder: '* * * * *',
  hasPreview: true,
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  isInvalid: undefined,
  isDisabled: undefined,
  disabled: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the cron expression. The `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();
const input = useTemplateRef<HTMLInputElement>('input');

const ctx = useFormControl();

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '*/5 * * * *',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const cron = controlled.value;

/* An empty field has nothing to describe and is not malformed — emptiness is `required`'s call. */
const isEmpty = computed(() => cron.value.trim() === '');
const preview = computed(() => (isEmpty.value ? '' : parseCron(cron.value)));

const isError = computed(
  () =>
    (props.isInvalid ?? ctx?.isInvalid) ||
    (!isEmpty.value && (preview.value.startsWith('Invalid') || preview.value.startsWith('Cron'))),
);

const inputState = computed(() => (isError.value ? InputStateValue.Invalid : (props.state ?? InputStateValue.Default)));

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue((event.target as HTMLInputElement).value);
}

/* Never a declared prop — a declared `'aria-describedby'` would arrive as
   `props.ariaDescribedby` and stop reaching the DOM. */
const ariaDescribedBy = computed(() => attrs[AriaAttribute.DescribedBy] as string | undefined);

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const describedBy = computed(() => ariaDescribedBy.value ?? ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.DescribedBy]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const wrapperClass = computed(() => cn('flex flex-col gap-1', attrs.class as ClassValue));

const inputClass = computed(() => cn(inputBaseVariants({ size: props.size, state: inputState.value }), 'font-mono'));

const previewClass = computed(() =>
  cn('px-1 text-xs', isError.value ? 'text-destructive-soft-foreground' : 'text-muted-foreground'),
);

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(input, controlled.reset, () => {
  if (input.value) input.value.value = String(cron.value ?? '');
});

defineExpose({ el: input });
</script>

<template>
  <div :class="wrapperClass">
    <input
      ref="input"
      type="text"
      :id="inputId"
      :value="cron"
      :placeholder="placeholder"
      :disabled="finalDisabled"
      :readonly="finalReadOnly"
      :required="finalRequired"
      :aria-invalid="isError || undefined"
      :aria-describedby="describedBy"
      :spellcheck="false"
      :class="inputClass"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
    />
    <div v-if="hasPreview" aria-live="polite" :class="previewClass">{{ preview }}</div>
    <input
      v-if="name"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="cron"
    />
  </div>
</template>
