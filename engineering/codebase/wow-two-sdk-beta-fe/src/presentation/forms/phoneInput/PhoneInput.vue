<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';

export interface PhoneInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The E.164 value, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial E.164 value when uncontrolled. */
  readonly defaultValue?: string;

  /** The ISO code selected before the value carries a recognisable dial prefix. Default `US`. */
  readonly defaultCountry?: string;

  /** The ISO codes the reader may pick, in display order; unknown codes are ignored. Default every known country. */
  readonly countries?: ReadonlyArray<string>;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** The read-only state. Falls back to the surrounding form control's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The national-number placeholder. Default the country's mask with zeros (`00-000-00-00`), none without a mask. */
  readonly placeholder?: string;

  /** The hidden input name; the hidden input emits the full E.164 value. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { useLocale } from '../../../foundation/i18n';
import { PhoneFormats, PhoneNumberExtensions } from '../../../foundation/phone';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants, InputSize } from '../InputStyles';
import { useNativeFormReset } from '../UseNativeFormReset';

/**
 * Renders a country dial-code select beside a national-number field, emitting one E.164 string.
 *
 * The field takes digits only and shows them through the country's mask (`foundation/phone` `PhoneFormats`); the
 * value never carries a mask character. Pair it with the `phone()` validator for the per-country digit count.
 */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'PhoneInput', inheritAttrs: false });

const props = withDefaults(defineProps<PhoneInputProps>(), {
  defaultCountry: 'US',
  placeholder: undefined,
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the number or switches country — the `v-model` half. */
  'update:modelValue': [e164: string];
}>();

const attrs = useAttrs();

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const e164 = controlled.value;

/* FormControlContext adoption — explicit props stay as overrides. The national-number
   input is the composite's primary control (carries the context id + describedby);
   a user `id` attr stays on the root div. */
const ctx = useFormControl();
const disabled = computed(() => props.isDisabled ?? ctx?.isDisabled);
const readOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly);
const invalid = computed(() => props.isInvalid ?? ctx?.isInvalid);

const allowed = computed(() => PhoneNumberExtensions.resolveCountries(props.countries));
/* The fallback must be selectable: a `defaultCountry` outside the list gives way to the first allowed country. */
const fallbackIso = computed(
  () => allowed.value.find((c) => c.iso === props.defaultCountry)?.iso ?? allowed.value[0]!.iso,
);

/* Selected ISO is state — shared dial codes (+1 US/CA) make it unrecoverable from the value
   alone. Re-derive only when the value's dial prefix becomes incompatible with the selection. */
const selectedIso = ref(fallbackIso.value);

/* A value whose dial prefix is outside the list matches no allowed country: its digits stay, under the fallback. */
const split = computed(() => {
  const selected = allowed.value.find((c) => c.iso === selectedIso.value);
  if (selected && (!e164.value || e164.value.startsWith(selected.dial))) {
    return {
      iso: selected.iso,
      national: PhoneNumberExtensions.digitsOf(e164.value.slice(selected.dial.length)),
    };
  }
  return PhoneNumberExtensions.split(e164.value, allowed.value, fallbackIso.value);
});

const iso = computed(() => split.value.iso);
const national = computed(() => split.value.national);
const country = computed(() => allowed.value.find((c) => c.iso === iso.value) ?? allowed.value[0]!);
const format = computed(() => PhoneNumberExtensions.formatOf(country.value));
/* A value under a dial code the field does not show (outside `countries`) displays its bare digits: the country's
   mask would read them as a national number they are not. */
const isForeign = computed(() => e164.value !== '' && !e164.value.startsWith(country.value.dial));
const displayed = computed(() =>
  isForeign.value ? national.value : PhoneNumberExtensions.formatNational(national.value, format.value),
);
const placeholderText = computed(() => {
  if (props.placeholder !== undefined) return props.placeholder;
  const mask = PhoneFormats[country.value.iso]?.mask;
  return mask ? mask.replace(/X/g, '0') : undefined;
});

/* A dial code alone is not a phone number: with no national digits the value is empty, so a blank field submits
   nothing and fails `required` — the selected country survives in `selectedIso`. */
function e164For(dial: string, digits: string): string {
  return digits ? `${dial}${digits}` : '';
}

function setCountry(event: Event): void {
  const nextIso = (event.target as HTMLSelectElement).value;
  const next = allowed.value.find((c) => c.iso === nextIso) ?? country.value;
  selectedIso.value = next.iso;
  const nextValue = e164For(next.dial, national.value);
  if (nextValue !== e164.value) controlled.setValue(nextValue);
}

function setDigits(digits: string): void {
  /* Deriving the country before the write keeps a shared dial code (+1 US / CA) on the reader's pick. */
  selectedIso.value = country.value.iso;
  const nextValue = e164For(country.value.dial, digits);
  if (nextValue !== e164.value) controlled.setValue(nextValue);
}

/* An international number replaces the whole field: an allowed dial prefix picks its country, any other keeps every
   digit as a foreign value, where the `phone()` rule reports it. Returns the text the field shows for it — computed
   here, since a controlled value reaches `displayed` only after the parent re-renders. */
function setInternational(text: string): string {
  const parsed = PhoneNumberExtensions.parseInternational(text, allowed.value, country.value.iso);
  if (parsed.country) {
    const max = PhoneNumberExtensions.lengthOf(parsed.country).max;
    const digits = parsed.e164.slice(parsed.country.dial.length, parsed.country.dial.length + max);
    selectedIso.value = parsed.country.iso;
    const nextValue = e164For(parsed.country.dial, digits);
    if (nextValue !== e164.value) controlled.setValue(nextValue);
    return PhoneNumberExtensions.formatNational(digits, PhoneNumberExtensions.formatOf(parsed.country));
  }

  const nextValue = parsed.e164.length > 1 ? parsed.e164 : '';
  if (nextValue !== e164.value) controlled.setValue(nextValue);
  return nextValue.slice(1);
}

/* Replacement text (autofill, drop, an untyped `input`) may carry a full `+…` number; typed text never does. */
const ReplacementInputTypes: ReadonlySet<string | undefined> = new Set([
  undefined,
  'insertReplacementText',
  'insertFromDrop',
  'insertFromPaste',
]);

/* The text is rewritten in place on every input: a rejected character changes no state, so Vue would leave it on
   screen. The caret goes back after the digit it followed. */
function setNational(event: Event): void {
  const field = event.target as HTMLInputElement;
  const inputEvent = event as InputEvent;
  if (inputEvent.isComposing) return;

  if (ReplacementInputTypes.has(inputEvent.inputType) && field.value.trimStart().startsWith('+')) {
    field.value = setInternational(field.value);
    placeCaret(field, field.value.length);
    return;
  }

  const edit = PhoneNumberExtensions.editNational({
    text: field.value,
    caret: field.selectionStart ?? field.value.length,
    previousDigits: national.value,
    inputType: inputEvent.inputType,
    format: format.value,
  });
  field.value = edit.text;
  placeCaret(field, edit.caret);
  setDigits(edit.digits);
}

/* A pasted `+…` number is international; digits that spell the selected country's dial code and a full national
   number (`998996632582`) lose the dial code; any other paste inserts at the caret as digits. */
function pasteNational(event: ClipboardEvent): void {
  const text = event.clipboardData?.getData('text') ?? '';
  const field = event.target as HTMLInputElement;
  if (text.trimStart().startsWith('+')) {
    event.preventDefault();
    field.value = setInternational(text);
    placeCaret(field, field.value.length);
    return;
  }

  const digits = PhoneNumberExtensions.digitsOf(text);
  const stripped = PhoneNumberExtensions.withoutDialCode(digits, country.value);
  if (stripped === digits) return;
  event.preventDefault();
  setDigits(stripped);
  field.value = PhoneNumberExtensions.formatNational(stripped, format.value);
  placeCaret(field, field.value.length);
}

function placeCaret(field: HTMLInputElement, caret: number): void {
  if (field.ownerDocument.activeElement === field) field.setSelectionRange(caret, caret);
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'inline-flex items-stretch overflow-hidden rounded-md border bg-background',
    invalid.value ? 'border-destructive' : 'border-input',
    disabled.value && 'opacity-60',
    readOnly.value && 'bg-muted text-muted-foreground',
    attrs.class as ClassValue,
  ),
);

/* The country select is a native `<select>`, which has no `readonly`: a read-only phone input disables it, so it
   takes the frame's muted surface and the default cursor rather than the pointer. */
const selectClass = computed(() =>
  cn(
    'h-10 cursor-pointer border-r border-input bg-card pl-2 pr-1 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    readOnly.value && 'cursor-default bg-muted text-muted-foreground',
  ),
);

/* One allowed country leaves nothing to pick: its flag and dial code sit in the select's place as plain text. */
const prefixClass = computed(() =>
  cn(
    'flex h-10 items-center border-r border-input bg-card px-2 text-sm',
    readOnly.value && 'bg-muted text-muted-foreground',
  ),
);

const inputClass = cn(
  inputBaseVariants({ size: InputSize.Md }),
  'rounded-none border-0 focus-visible:ring-0 readonly:focus-visible:ring-0',
);

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

const locale = useLocale();
</script>

<template>
  <div :key="formResetRevision" :data-readonly="readOnly || undefined" :class="rootClass" v-bind="passthroughAttrs">
    <span v-if="allowed.length === 1" :class="prefixClass">{{ country.flag }} {{ country.dial }}</span>
    <select
      v-else
      :aria-label="locale.t('PhoneInput.country', undefined, 'Country')"
      :value="iso"
      :disabled="disabled || readOnly"
      :class="selectClass"
      :style="{ minWidth: '90px' }"
      @change="setCountry"
    >
      <option v-for="c in allowed" :key="c.iso" :value="c.iso">{{ c.flag }} {{ c.dial }}</option>
    </select>
    <input
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      :id="ctx?.id"
      :value="displayed"
      :placeholder="placeholderText"
      :disabled="disabled"
      :readonly="readOnly"
      :aria-invalid="invalid || undefined"
      :aria-describedby="ctx?.describedBy"
      :aria-required="ctx?.isRequired || undefined"
      :class="inputClass"
      @input="setNational"
      @paste="pasteNational"
    />
    <input
      v-if="name"
      type="hidden"
      :disabled="disabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="e164"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
