<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
/** Represents one selectable dialling country. */
export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string; // includes leading +
  flag: string; // emoji
}

export const PhoneCountries: ReadonlyArray<PhoneCountry> = [
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { iso: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { iso: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { iso: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { iso: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { iso: 'CZ', name: 'Czechia', dial: '+420', flag: '🇨🇿' },
  { iso: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { iso: 'TR', name: 'Türkiye', dial: '+90', flag: '🇹🇷' },
  { iso: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { iso: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { iso: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { iso: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { iso: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { iso: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { iso: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { iso: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { iso: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { iso: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { iso: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { iso: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { iso: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { iso: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { iso: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { iso: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
  { iso: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { iso: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { iso: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { iso: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { iso: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { iso: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
];

export interface PhoneInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The E.164 value, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial E.164 value when uncontrolled. */
  readonly defaultValue?: string;

  /** The ISO code selected before the value carries a recognisable dial prefix. Default `US`. */
  readonly defaultCountry?: string;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** The read-only state. Falls back to the surrounding form control's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The national-number placeholder. */
  readonly placeholder?: string;

  /** The hidden input name; the hidden input emits the full E.164 value. */
  readonly name?: string;
}

function splitE164(value: string, defaultIso: string): { iso: string; national: string } {
  if (!value) return { iso: defaultIso, national: '' };
  // Match the longest dial code prefix.
  const sorted = [...PhoneCountries].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (value.startsWith(c.dial)) {
      return { iso: c.iso, national: value.slice(c.dial.length).replace(/\D/g, '') };
    }
  }
  return { iso: defaultIso, national: value.replace(/\D/g, '') };
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputSize } from '../InputStyles';

/**
 * Renders a country dial-code select beside a national-number field, emitting one E.164 string.
 *
 * First-generation country list; full `libphonenumber` validation and formatting stays deferred.
 */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'PhoneInput', inheritAttrs: false });

const props = withDefaults(defineProps<PhoneInputProps>(), {
  defaultCountry: 'US',
  placeholder: '(555) 555-5555',
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

/* Selected ISO is state — shared dial codes (+1 US/CA) make it unrecoverable from the value
   alone. Re-derive only when the value's dial prefix becomes incompatible with the selection. */
const selectedIso = ref(props.defaultCountry);

const split = computed(() => {
  const selected = PhoneCountries.find((c) => c.iso === selectedIso.value);
  if (selected && (!e164.value || e164.value.startsWith(selected.dial))) {
    return {
      iso: selected.iso,
      national: e164.value.slice(selected.dial.length).replace(/\D/g, ''),
    };
  }
  return splitE164(e164.value, props.defaultCountry);
});

const iso = computed(() => split.value.iso);
const national = computed(() => split.value.national);
const country = computed(() => PhoneCountries.find((c) => c.iso === iso.value) ?? PhoneCountries[0]!);

/* A dial code alone is not a phone number: with no national digits the value is empty, so a blank field submits
   nothing and fails `required` — the selected country survives in `selectedIso`. */
function e164For(dial: string, digits: string): string {
  return digits ? `${dial}${digits}` : '';
}

function setCountry(event: Event): void {
  const nextIso = (event.target as HTMLSelectElement).value;
  const next = PhoneCountries.find((c) => c.iso === nextIso) ?? country.value;
  selectedIso.value = next.iso;
  const nextValue = e164For(next.dial, national.value);
  if (nextValue !== e164.value) controlled.setValue(nextValue);
}

function setNational(event: Event): void {
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '');
  /* Deriving the country before the write keeps a shared dial code (+1 US / CA) on the reader's pick. */
  selectedIso.value = country.value.iso;
  controlled.setValue(e164For(country.value.dial, digits));
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
    attrs.class as ClassValue,
  ),
);

const selectClass = cn(
  'h-10 cursor-pointer border-r border-input bg-card pl-2 pr-1 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
);

const inputClass = cn(inputBaseVariants({ size: InputSize.Md }), 'rounded-none border-0 focus-visible:ring-0');

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

const locale = useLocale();
</script>

<template>
  <div :key="formResetRevision" :class="rootClass" v-bind="passthroughAttrs">
    <select
      :aria-label="locale.t('PhoneInput.country', undefined, 'Country')"
      :value="iso"
      :disabled="disabled || readOnly"
      :class="selectClass"
      :style="{ minWidth: '90px' }"
      @change="setCountry"
    >
      <option v-for="c in PhoneCountries" :key="c.iso" :value="c.iso">{{ c.flag }} {{ c.dial }}</option>
    </select>
    <input
      type="tel"
      inputmode="tel"
      autocomplete="tel-national"
      :id="ctx?.id"
      :value="national"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readOnly"
      :aria-invalid="invalid || undefined"
      :aria-describedby="ctx?.describedBy"
      :aria-required="ctx?.isRequired || undefined"
      :class="inputClass"
      @input="setNational"
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
