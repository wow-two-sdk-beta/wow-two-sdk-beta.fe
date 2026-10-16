<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { Temporal } from 'temporal-polyfill';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';

export interface TimeInputProps extends /* @vue-ignore */ NativeInputAttributes<'min' | 'max'> {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The value, controlled. The `v-model` binding target. `null` is the cleared state. */
  readonly modelValue?: Temporal.PlainTime | null;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: Temporal.PlainTime | null;

  /**
   * Renders a bare `<input type="time">` and drops the popover.
   *
   * Opt-in only. The browser owns that control's picker panel — it cannot be themed, so it
   * lands a system-chrome popup in the middle of a design-system form. Reach for it when the
   * platform picker is the point (a mobile-first form wanting the OS wheel, for instance).
   */
  readonly isNative?: boolean;
  /** @deprecated Use `isNative`; this alias is removed next release. */
  readonly native?: boolean;

  /** The minute interval offered in the popover. Default 5. Ignored when `isNative`. */
  readonly minuteStep?: number;
  /** Inclusive same-day time bounds. */
  readonly min?: Temporal.PlainTime | null;
  readonly max?: Temporal.PlainTime | null;

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

/** Accepts `9`, `09`, `930`, `9:30`, `09:30` — hour alone, or hour + 2-digit minute. */
const TimeText = /^(\d{1,2})(?::?(\d{2}))?$/;
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Temporal as TemporalValue } from 'temporal-polyfill';
import { Clock } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';
import { formatISOTime, isTimeInBounds, normalizeMinuteStep } from '../DateExtensions';
import TimeColumns from '../TimeColumns.vue';

/**
 * Renders a typed `HH:MM` field with a design-system popover on the trailing clock button.
 * Accepts and emits `Temporal.PlainTime`.
 *
 * The popover is ours (`TimeColumns` inside `overlays/popover`), not the browser's: an
 * `<input type="time">` opens an unstylable system panel, which is what `isNative` is for.
 */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'TimeInput', inheritAttrs: false });

const props = withDefaults(defineProps<TimeInputProps>(), {
  isNative: undefined,
  native: undefined,
  minuteStep: 5,
  placeholder: '--:--',
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
  /** Fires when the reader types a time or picks one in the popover — the `v-model` half. */
  'update:modelValue': [value: Temporal.PlainTime | null];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<Temporal.PlainTime | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const committed = controlled.value;

const open = ref(false);

/** The in-flight text — free-form while typing, reconciled with `committed` on commit. */
const draft = ref<string>(formatISOTime(committed.value));

/* Syncs the draft when the committed value changes from the outside (or from the popover). */
watch(committed, (next) => {
  draft.value = formatISOTime(next);
});

function parseTimeText(text: string): Temporal.PlainTime | null {
  const match = TimeText.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return new TemporalValue.PlainTime(hour, minute);
}

/** Commits the draft; an unparseable draft reverts to the committed value (ColorInput parity). */
function commit(): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  if (!draft.value.trim()) {
    controlled.setValue(null);
    draft.value = '';
    return;
  }
  const next = parseTimeText(draft.value);
  if (next && isTimeInBounds(next, props.min, props.max)) {
    controlled.setValue(next);
    draft.value = formatISOTime(next);
  } else {
    draft.value = formatISOTime(committed.value);
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

/** The `isNative` path keeps the original `HH:MM`-string round trip. */
function onNativeInput(event: Event): void {
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) return;
  const input = event.target as HTMLInputElement;
  if (!input.validity.valid) {
    input.value = displayValue.value;
    return;
  }
  const raw = (event.target as HTMLInputElement).value;
  controlled.setValue(raw ? parseTimeText(raw) : null);
}

function onColumnsChange(next: Temporal.PlainTime): void {
  if (finalDisabled.value || finalReadOnly.value || !isTimeInBounds(next, props.min, props.max)) return;
  controlled.setValue(next);
}

const displayValue = computed(() => formatISOTime(committed.value));

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
      type="time"
      :min="formatISOTime(min)"
      :max="formatISOTime(max)"
      :step="normalizeMinuteStep(minuteStep) * 60"
      :id="inputId"
      :value="displayValue"
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
        inputmode="numeric"
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
        :aria-label="locale.t('TimeInput.chooseTime', undefined, 'Choose time')"
        :disabled="finalDisabled || finalReadOnly"
        class="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Clock class="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent is-bare>
        <TimeColumns
          :is-disabled="finalDisabled || finalReadOnly"
          :min="min"
          :max="max"
          :model-value="committed"
          :minute-step="minuteStep"
          @update:modelValue="onColumnsChange"
        />
      </PopoverContent>
    </Popover>
  </div>
</template>
