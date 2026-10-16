<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { Temporal } from 'temporal-polyfill';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';

export interface DateInputProps extends /* @vue-ignore */ NativeInputAttributes<'min' | 'max'> {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The value, controlled. The `v-model` binding target. `null` is the cleared state. */
  readonly modelValue?: Temporal.PlainDate | null;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: Temporal.PlainDate | null;

  /** The earliest selectable date. */
  readonly min?: Temporal.PlainDate | null;

  /** The latest selectable date. */
  readonly max?: Temporal.PlainDate | null;

  /**
   * Renders a bare `<input type="date">` and drops the popover.
   *
   * Opt-in only. The browser owns that control's picker panel — it cannot be themed, so it
   * lands a system-chrome popup in the middle of a design-system form. Reach for it when the
   * platform picker is the point (a mobile-first form wanting the OS wheels, for instance).
   */
  readonly isNative?: boolean;
  /** @deprecated Use `isNative`; this alias is removed next release. */
  readonly native?: boolean;

  /** The empty-state text. Ignored when `isNative` — that control renders its own mask. */
  readonly placeholder?: string;

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
import { Calendar as CalendarIcon } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';
import { formatISODate, isDateDisabled, parseISODate, today } from '../DateExtensions';
import CalendarPicker from '../calendarPicker/CalendarPicker.vue';

/**
 * Renders a typed `YYYY-MM-DD` field with a design-system `CalendarPicker` popover on the trailing button.
 * Accepts and emits `Temporal.PlainDate`.
 *
 * The popover is ours, not the browser's: an `<input type="date">` opens an unstylable system
 * panel, which is what `isNative` is for. `DatePicker` is the trigger-shaped peer — reach for
 * this one when the form wants a text field the user can type into.
 */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'DateInput', inheritAttrs: false });

const props = withDefaults(defineProps<DateInputProps>(), {
  isNative: undefined,
  native: undefined,
  placeholder: 'YYYY-MM-DD',
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
  /** Fires when the reader types a date or picks one in the calendar — the `v-model` half. */
  'update:modelValue': [value: Temporal.PlainDate | null];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<Temporal.PlainDate | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const committed = controlled.value;

const open = ref(false);

/** The ISO form the native control, the typed field and form submission all speak. */
const displayValue = computed(() => formatISODate(committed.value));

/** The in-flight text — free-form while typing, reconciled with `committed` on commit. */
const draft = ref<string>(displayValue.value);

/* Syncs the draft when the committed value changes from the outside (or from the popover). */
watch(displayValue, (next) => {
  draft.value = next;
});

/** Commits the draft; an unparseable draft reverts to the committed value (ColorInput parity). */
function commit(): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  if (!draft.value.trim()) {
    controlled.setValue(null);
    draft.value = '';
    return;
  }
  const next = parseISODate(draft.value.trim());
  if (next && !isDateDisabled(next, { min: props.min, max: props.max })) {
    controlled.setValue(next);
    draft.value = formatISODate(next);
  } else {
    draft.value = displayValue.value;
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
    input.value = displayValue.value;
    return;
  }
  controlled.setValue(parseISODate((event.target as HTMLInputElement).value));
}

/* A day is the whole value here, so the pick closes the panel — `DatePicker` parity, and
   unlike `DateTimeInput`, where the time half still has to be chosen. */
function onCalendarChange(next: Temporal.PlainDate | null): void {
  if (finalDisabled.value || finalReadOnly.value || (next && isDateDisabled(next, { min: props.min, max: props.max })))
    return;
  controlled.setValue(next);
  open.value = false;
}

const calendarMonth = computed(() => committed.value ?? today());
const minValue = computed(() => formatISODate(props.min));
const maxValue = computed(() => formatISODate(props.max));

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
  if (root.value) root.value.value = String(displayValue.value ?? '');
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
      type="date"
      :id="inputId"
      :value="displayValue"
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
        :aria-label="locale.t('DateInput.chooseDate', undefined, 'Choose date')"
        :disabled="finalDisabled || finalReadOnly"
        class="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <CalendarIcon class="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent is-bare>
        <CalendarPicker
          :model-value="committed"
          :is-disabled="Boolean(finalDisabled || finalReadOnly)"
          :default-month="calendarMonth"
          :min="min"
          :max="max"
          @update:modelValue="onCalendarChange"
        />
      </PopoverContent>
    </Popover>
  </div>
</template>
