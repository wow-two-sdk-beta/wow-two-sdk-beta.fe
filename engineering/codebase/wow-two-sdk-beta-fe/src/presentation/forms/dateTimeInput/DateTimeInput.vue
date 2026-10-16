<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { Temporal } from 'temporal-polyfill';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';

export interface DateTimeInputProps extends /* @vue-ignore */ NativeInputAttributes<'min' | 'max'> {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The value, controlled. The `v-model` binding target. `null` is the cleared state. */
  readonly modelValue?: Temporal.PlainDateTime | null;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: Temporal.PlainDateTime | null;

  /** The earliest selectable wall-clock instant. */
  readonly min?: Temporal.PlainDateTime | null;

  /** The latest selectable wall-clock instant. */
  readonly max?: Temporal.PlainDateTime | null;

  /**
   * Renders a bare `<input type="datetime-local">` and drops the popover.
   *
   * Opt-in only. The browser owns that control's picker panel — it cannot be themed, so it
   * lands a system-chrome popup in the middle of a design-system form. Reach for it when the
   * platform picker is the point (a mobile-first form wanting the OS wheels, for instance).
   */
  readonly isNative?: boolean;
  /** @deprecated Use `isNative`; this alias is removed next release. */
  readonly native?: boolean;

  /** The minute interval offered in the popover. Default 5. Ignored when `isNative`. */
  readonly minuteStep?: number;

  /** The empty-state text. Ignored when `isNative` — that control renders its own mask. */
  readonly placeholder?: string;

  /** The hidden input name; when set, a hidden input ships the ISO value with form submission. */
  readonly name?: string;

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
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { CalendarClock } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';
import {
  formatISODateTime,
  isDateTimeInBounds,
  clampDateTime,
  clampDate,
  normalizeMinuteStep,
  parseISODate,
  parseISODateTime,
  today,
} from '../DateExtensions';
import CalendarPicker from '../calendarPicker/CalendarPicker.vue';
import TimeColumns from '../TimeColumns.vue';

/**
 * Renders a typed `YYYY-MM-DD HH:MM` field with a `CalendarPicker` plus hour/minute popover on its button.
 * Accepts and emits `Temporal.PlainDateTime` (calendar wall-clock, no zone).
 *
 * The popover is ours, not the browser's: an `<input type="datetime-local">` opens an
 * unstylable system panel, which is what `isNative` is for.
 */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'DateTimeInput', inheritAttrs: false });

const props = withDefaults(defineProps<DateTimeInputProps>(), {
  isNative: undefined,
  native: undefined,
  minuteStep: 5,
  placeholder: 'YYYY-MM-DD HH:MM',
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form
     control context, and Vue casts an absent `boolean` prop to `false` — which would
     shadow the context with a hard "not disabled / not required". */
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});

/** `isNative` first, then the deprecated `native`. */
const usesNativeControl = computed(() => props.isNative ?? props.native ?? false);

const emit = defineEmits<{
  /** Fires when the reader types or picks a date and time — the `v-model` half. */
  'update:modelValue': [value: Temporal.PlainDateTime | null];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<Temporal.PlainDateTime | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const committed = controlled.value;

const open = ref(false);

/** The ISO form the native control and form submission both speak. */
const isoValue = computed(() => formatISODateTime(committed.value));

/** The typed form — the same ISO with the `T` softened to a space. */
const displayText = computed(() => isoValue.value.replace('T', ' '));

/** The in-flight text — free-form while typing, reconciled with `committed` on commit. */
const draft = ref<string>(displayText.value);

/* Syncs the draft when the committed value changes from the outside (or from the popover). */
watch(displayText, (next) => {
  draft.value = next;
});

/** Accepts `YYYY-MM-DD HH:MM`, its `T` spelling, and a bare `YYYY-MM-DD` (→ midnight). */
function parseDateTimeText(text: string): Temporal.PlainDateTime | null {
  const normalised = text.trim().replace(/\s+/, 'T');
  const full = parseISODateTime(normalised);
  if (full) return full;
  const dateOnly = parseISODate(normalised);
  return dateOnly ? dateOnly.toPlainDateTime() : null;
}

/** Commits the draft; an unparseable draft reverts to the committed value (ColorInput parity). */
function commit(): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  if (!draft.value.trim()) {
    controlled.setValue(null);
    draft.value = '';
    return;
  }
  const next = parseDateTimeText(draft.value);
  if (next && isDateTimeInBounds(next, props.min, props.max)) {
    controlled.setValue(next);
    draft.value = formatISODateTime(next).replace('T', ' ');
  } else {
    draft.value = displayText.value;
  }
}

function onDraftInput(event: Event): void {
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) return;
  draft.value = (event.target as HTMLInputElement).value;
}

/* Runs after any caller-supplied `@blur` — declared after `v-bind`, so Vue chains theirs first. */
function onBlur(): void {
  commit();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    commit();
  }
}

/** The `isNative` path keeps the original ISO-string round trip. */
function onNativeInput(event: Event): void {
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) return;
  const input = event.target as HTMLInputElement;
  if (!input.validity.valid) {
    input.value = isoValue.value;
    return;
  }
  controlled.setValue(parseISODateTime((event.target as HTMLInputElement).value));
}

/* A date pick keeps the time that was already set; a time pick keeps the date. Neither
   closes the popover — the other half still has to be chosen. */
function onCalendarChange(date: Temporal.PlainDate | null): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  if (!date) {
    controlled.setValue(null);
    return;
  }
  const next = clampDateTime(date.toPlainDateTime(committed.value?.toPlainTime()), props.min, props.max);
  if (isDateTimeInBounds(next, props.min, props.max)) controlled.setValue(next);
}

function onColumnsChange(time: Temporal.PlainTime): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  const date = clampDate(committed.value?.toPlainDate() ?? today(), props.min?.toPlainDate(), props.max?.toPlainDate());
  const next = date.toPlainDateTime(time);
  if (isDateTimeInBounds(next, props.min, props.max)) controlled.setValue(next);
}

const calendarValue = computed(() => committed.value?.toPlainDate() ?? null);
const calendarMonth = computed(() =>
  clampDate(calendarValue.value ?? today(), props.min?.toPlainDate(), props.max?.toPlainDate()),
);
const minTime = computed(() => (props.min?.toPlainDate().equals(calendarMonth.value) ? props.min.toPlainTime() : null));
const maxTime = computed(() => (props.max?.toPlainDate().equals(calendarMonth.value) ? props.max.toPlainTime() : null));
const timeValue = computed(() => committed.value?.toPlainTime() ?? null);

/* The day bounds the calendar can express — the hour half of `min`/`max` stays the typed
   field's business, exactly as it was under the native control. */
const minDate = computed(() => props.min?.toPlainDate() ?? null);
const maxDate = computed(() => props.max?.toPlainDate() ?? null);
const minValue = computed(() => formatISODateTime(props.min));
const maxValue = computed(() => formatISODateTime(props.max));

const finalState = computed(() => props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? ctx?.isReadOnly ?? false);
watch([finalDisabled, finalReadOnly], ([disabled, readOnly]) => {
  if (disabled || readOnly) open.value = false;
});
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'value']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

/* The caller's `class` sizes the field and the input keeps `w-full` from the variants —
   the adorned-input idiom already used by `PasswordInput` / `SearchInput`. */
const wrapperClass = computed(() => cn('relative', attrs.class as ClassValue));

const inputClass = computed(() =>
  cn(
    inputBaseVariants({
      size: props.size,
      state: finalState.value,
      border: props.border,
      ring: props.ring,
    }),
    !usesNativeControl.value && 'pr-10',
  ),
);

const root = useTemplateRef<HTMLInputElement>('root');

/** The rendered `<input>` — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(root, controlled.reset, () => {
  if (root.value) root.value.value = String(isoValue.value ?? '');
});

defineExpose({ el: root });

const locale = useLocale();
</script>

<template>
  <div :class="wrapperClass">
    <!-- The unstylable-system-panel path, kept for callers that want the platform picker. -->
    <input
      v-if="usesNativeControl"
      ref="root"
      type="datetime-local"
      :step="normalizeMinuteStep(minuteStep) * 60"
      :id="inputId"
      :value="isoValue"
      :min="minValue"
      :max="maxValue"
      :disabled="finalDisabled"
      :readonly="finalReadOnly"
      :required="finalRequired"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :class="inputClass"
      v-bind="passthroughAttrs"
      @input="onNativeInput"
    />

    <Popover v-else v-model:open="open" placement="bottom-start" :offset="6">
      <input
        ref="root"
        type="text"
        autocomplete="off"
        :spellcheck="false"
        :id="inputId"
        :value="draft"
        :placeholder="placeholder"
        :disabled="finalDisabled"
        :readonly="finalReadOnly"
        :required="finalRequired"
        :aria-invalid="isInvalid"
        :aria-describedby="describedBy"
        :class="inputClass"
        v-bind="passthroughAttrs"
        @input="onDraftInput"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <PopoverTrigger
        :aria-label="locale.t('DateTimeInput.chooseDateAndTime', undefined, 'Choose date and time')"
        :disabled="finalDisabled || finalReadOnly"
        class="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <CalendarClock class="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent is-bare>
        <div class="flex items-start gap-2">
          <CalendarPicker
            :model-value="calendarValue"
            :is-disabled="Boolean(finalDisabled || finalReadOnly)"
            :default-month="calendarMonth"
            :min="minDate"
            :max="maxDate"
            @update:modelValue="onCalendarChange"
          />
          <TimeColumns
            :is-disabled="finalDisabled || finalReadOnly"
            :min="minTime"
            :max="maxTime"
            :model-value="timeValue"
            :minute-step="minuteStep"
            @update:modelValue="onColumnsChange"
          />
        </div>
      </PopoverContent>
    </Popover>

    <input
      v-if="name"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="isoValue"
    />
  </div>
</template>
