<script lang="ts">
import type { Size } from '../../../foundation/styles';

/** Defines the character set a pin-input cell accepts. */
export const PinInputType = {
  /** Refers to digits only (`0-9`). */
  Numeric: 'numeric',
  /** Refers to any single alphanumeric character. */
  Alphanumeric: 'alphanumeric',
} as const;

export type PinInputType = (typeof PinInputType)[keyof typeof PinInputType];

export interface PinInputProps {
  /** The number of digit cells. Default 6. */
  readonly length?: number;

  /** The value, controlled (full string). The `v-model` binding target. */
  readonly modelValue?: string;

  /** The uncontrolled initial value. */
  readonly defaultValue?: string;

  /** The allowed characters — digits (`numeric`) or any single char (`alphanumeric`). Default `numeric`. */
  readonly type?: PinInputType;

  /** The cell visual size. Default `md`. */
  readonly size?: Size;

  /** The masked mode — renders each cell as `*` (good for verification codes). */
  readonly isMasked?: boolean;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
}

/* Sizes not listed fall back to the `md` row at the call site. */
const SizeClass: Partial<Record<Size, string>> = {
  sm: 'h-9 w-9 text-base',
  md: 'h-11 w-11 text-lg',
  lg: 'h-14 w-14 text-xl',
};
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, Size as SizeValue } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState } from '../InputStyles';

/** Renders a row of single-character PIN cells with auto-advance, paste-spread and backspace-to-previous. */
/* `inheritAttrs: false` so `class` folds into the wrapper's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'PinInput', inheritAttrs: false });

const props = withDefaults(defineProps<PinInputProps>(), {
  length: 6,
  type: PinInputType.Numeric,
  size: SizeValue.Md,
  /* Explicit `undefined` defaults are load-bearing: `isDisabled` falls back to the form
     control context, and Vue casts an absent `boolean` prop to `false`. */
  isMasked: undefined,
  isDisabled: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader types, pastes or deletes a character — the `v-model` half. */
  'update:modelValue': [value: string];
  /** Fires when the reader fills the final cell, carrying the complete code. */
  complete: [value: string];
}>();

const attrs = useAttrs();
const locale = useLocale();

/* Per-cell array state — a joined string compacts empties, remapping cell i to char 0. */
function toCells(s: string): ReadonlyArray<string> {
  return Array.from({ length: props.length }, (_, i) => s[i] ?? '');
}

const controlled = useControlled<ReadonlyArray<string>>({
  controlled: () => {
    const external = props.modelValue;
    return external === undefined ? undefined : toCells(external);
  },
  default: () => toCells(props.defaultValue ?? ''),
  onChange: (next) => {
    emit('update:modelValue', next.join(''));
  },
});

const cells = controlled.value;

/* Plain array of element refs, filled by the function ref below — the Vue counterpart of
   React's `useRef<Array<HTMLInputElement | null>>`. */
const inputs: Array<HTMLInputElement | null> = [];

function setCellRef(el: unknown, index: number): void {
  inputs[index] = el instanceof HTMLInputElement ? el : null;
}

/* FormControlContext adoption — flags cascade onto every cell; the id/describedby
   land on the FIRST cell (the composite's primary input), so `Field`-rendered
   labels/helper reach the control. A user `id` prop stays on the wrapper div. */
const ctx = useFormControl();
const isDisabled = computed(() => props.isDisabled ?? ctx?.isDisabled);
const isInvalid = computed(() => ctx?.isInvalid ?? false);
const isReadOnly = computed(() => ctx?.isReadOnly || undefined);

function isAllowed(ch: string): boolean {
  return props.type === PinInputType.Numeric ? /^[0-9]$/.test(ch) : /^[A-Za-z0-9]$/.test(ch);
}

function update(next: ReadonlyArray<string>): void {
  if (isDisabled.value || isReadOnly.value) return;
  controlled.setValue(next);
  if (next.every(Boolean)) emit('complete', next.join(''));
}

function onCellInput(index: number, event: Event): void {
  const ch = (event.target as HTMLInputElement).value.slice(-1);
  if (ch && !isAllowed(ch)) return;
  const arr = cells.value.slice();
  arr[index] = ch;
  update(arr);
  if (ch && index < props.length - 1) inputs[index + 1]?.focus();
}

function onCellKeydown(index: number, event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  if (event.key === 'Backspace' && !cells.value[index] && index > 0) {
    inputs[index - 1]?.focus();
  } else if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault();
    inputs[index - 1]?.focus();
  } else if (event.key === 'ArrowRight' && index < props.length - 1) {
    event.preventDefault();
    inputs[index + 1]?.focus();
  }
}

function onPaste(event: ClipboardEvent): void {
  if (event.defaultPrevented || isDisabled.value || isReadOnly.value) return;
  const pasted = event.clipboardData?.getData('text').replace(/\s+/g, '') ?? '';
  const filtered = pasted.split('').filter(isAllowed).join('');
  if (filtered) {
    event.preventDefault();
    update(toCells(filtered));
    const focusIdx = Math.min(filtered.length, props.length - 1);
    inputs[focusIdx]?.focus();
  }
}

const cellType = computed(() => (props.isMasked ? 'password' : 'text'));
const inputMode = computed(() => (props.type === PinInputType.Numeric ? 'numeric' : 'text'));

/* Cells are internal — consumers can't label them individually, so each carries a built-in
   name (the aria-label wins over a `Field` label's htmlFor, keeping per-digit announcements). */
function cellLabel(index: number): string {
  return props.type === PinInputType.Numeric
    ? locale.t('PinInput.digit', { index: index + 1, length: props.length }, 'Digit {index} of {length}')
    : locale.t('PinInput.character', { index: index + 1, length: props.length }, 'Character {index} of {length}');
}

const firstCellId = computed(() => ctx?.id);
const firstCellDescribedBy = computed(() => ctx?.describedBy);
const firstCellRequired = computed(() => ctx?.isRequired || undefined);

const cellClass = computed(() =>
  cn(
    inputBaseVariants({ state: isInvalid.value ? InputState.Invalid : InputState.Default }),
    'text-center font-medium',
    SizeClass[props.size] ?? SizeClass.md,
  ),
);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('inline-flex gap-2', attrs.class as ClassValue));

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered wrapper — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <div :key="formResetRevision" ref="root" :class="rootClass" v-bind="passthroughAttrs">
    <!-- Keyed on the position: the cells never reorder, and a PIN repeats characters freely. -->
    <input
      v-for="(ch, i) in cells"
      :key="i"
      :ref="(el) => setCellRef(el, i)"
      :type="cellType"
      :inputmode="inputMode"
      :aria-label="cellLabel(i)"
      :id="i === 0 ? firstCellId : undefined"
      :aria-describedby="i === 0 ? firstCellDescribedBy : undefined"
      :aria-required="i === 0 ? firstCellRequired : undefined"
      :aria-invalid="isInvalid || undefined"
      autocomplete="one-time-code"
      :maxlength="1"
      :disabled="isDisabled"
      :readonly="isReadOnly"
      :value="ch"
      :class="cellClass"
      @input="onCellInput(i, $event)"
      @keydown="onCellKeydown(i, $event)"
      @paste="onPaste"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
