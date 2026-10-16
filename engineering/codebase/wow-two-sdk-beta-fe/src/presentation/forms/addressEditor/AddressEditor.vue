<script lang="ts">
export interface Address {
  country: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
}

interface CountryConfig {
  iso: string;
  name: string;
  regionLabel: string;
  postalLabel: string;
  regionOptions?: Array<{ value: string; label: string }>;
}

const CountryConfigs: ReadonlyArray<CountryConfig> = [
  {
    iso: 'US',
    name: 'United States',
    regionLabel: 'State',
    postalLabel: 'ZIP code',
    regionOptions: [
      'AL',
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'DE',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MA',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NJ',
      'NM',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WV',
      'WI',
      'WY',
    ].map((s) => ({ value: s, label: s })),
  },
  {
    iso: 'CA',
    name: 'Canada',
    regionLabel: 'Province',
    postalLabel: 'Postal code',
    regionOptions: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'].map((s) => ({
      value: s,
      label: s,
    })),
  },
  { iso: 'GB', name: 'United Kingdom', regionLabel: 'County', postalLabel: 'Postcode' },
  { iso: 'DE', name: 'Germany', regionLabel: 'Bundesland', postalLabel: 'PLZ' },
  { iso: 'FR', name: 'France', regionLabel: 'Région', postalLabel: 'Code postal' },
  { iso: 'AU', name: 'Australia', regionLabel: 'State', postalLabel: 'Postcode' },
  { iso: 'JP', name: 'Japan', regionLabel: 'Prefecture', postalLabel: '〒' },
];

const FallbackCountry: CountryConfig = {
  iso: 'XX',
  name: 'Other',
  regionLabel: 'Region',
  postalLabel: 'Postal code',
};

function configFor(iso: string): CountryConfig {
  return CountryConfigs.find((c) => c.iso === iso) ?? FallbackCountry;
}

export interface AddressEditorProps {
  /** The address, controlled. The `v-model` binding target. */
  readonly modelValue?: Address;

  /** The initial address when uncontrolled. */
  readonly defaultValue?: Address;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** The read-only state. Falls back to the surrounding form control's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** Whether city / region / postal stack in one column instead of three. */
  readonly isCompact?: boolean;

  /** The prefix for hidden inputs (`{name}.line1`, etc.). */
  readonly name?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}

/** The free-text address fields, i.e. every field but `country`. */
type AddressTextField = 'line1' | 'line2' | 'city' | 'region' | 'postalCode';

const EmptyAddress: Address = { country: 'US', line1: '', city: '', region: '', postalCode: '' };

export const AddressCountries = CountryConfigs;
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputSize } from '../InputStyles';

/**
 * Renders a country-aware address block whose country select relabels the region and postal fields.
 *
 * Built-in config for US/CA/GB/DE/FR/AU/JP; a generic fallback covers the rest.
 *
 * Form-aware at GROUP level: inside a `Field`/`form.Field` the root (`role="group"`)
 * takes the context id + `aria-labelledby`/`aria-describedby`/`aria-invalid`, and
 * the disabled/read-only flags cascade to every sub-field (each keeps its own
 * self-contained label/id pair).
 */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'AddressEditor', inheritAttrs: false });

const props = withDefaults(defineProps<AddressEditorProps>(), {
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  defaultValue: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits any address field — the `v-model` half. */
  'update:modelValue': [address: Address];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const ctx = useFormControl();
const isDisabled = computed(() => props.isDisabled ?? ctx?.isDisabled);
const isReadOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly);

const controlled = useControlled<Address>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? EmptyAddress,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const address = controlled.value;

const config = computed(() => configFor(address.value.country));

const ids = {
  country: useId('country'),
  line1: useId('line1'),
  line2: useId('line2'),
  city: useId('city'),
  region: useId('region'),
  postal: useId('postal'),
};

function update(patch: Partial<Address>): void {
  controlled.setValue({ ...address.value, ...patch });
}

function onCountryChange(event: Event): void {
  update({ country: (event.target as HTMLSelectElement).value, region: '' });
}

/* Written through a typed local rather than a computed-key object literal: a union-keyed
   `{ [key]: value }` widens to an index signature and stops matching `Partial<Address>`. */
function onFieldInput(key: AddressTextField, event: Event): void {
  const patch: Partial<Address> = {};
  patch[key] = (event.target as HTMLInputElement).value;
  update(patch);
}

function onRegionSelect(event: Event): void {
  update({ region: (event.target as HTMLSelectElement).value });
}

const rootId = computed(() => props.id ?? ctx?.id);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('flex flex-col gap-3', attrs.class as ClassValue));

const gridClass = computed(() => cn('grid gap-3', props.isCompact ? 'grid-cols-1' : 'grid-cols-3'));

const controlClass = cn(inputBaseVariants({ size: InputSize.Md }));

/** The rendered root `<div>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

const locale = useLocale();
</script>

<template>
  <div
    :key="formResetRevision"
    ref="el"
    role="group"
    :id="rootId"
    :aria-labelledby="ctx?.labelledBy"
    :aria-describedby="ctx?.describedBy"
    :aria-invalid="ctx?.isInvalid || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <!-- Country -->
    <div class="flex flex-col gap-1">
      <label :for="ids.country" class="text-xs font-medium text-foreground"
        >{{ locale.t('AddressEditor.country', undefined, 'Country') }}
      </label>
      <select
        :id="ids.country"
        :value="address.country"
        :disabled="isDisabled || isReadOnly"
        :class="controlClass"
        @change="onCountryChange"
      >
        <option v-for="c in AddressCountries" :key="c.iso" :value="c.iso">{{ c.name }}</option>
        <option value="XX">{{ locale.t('AddressEditor.other', undefined, 'Other') }}</option>
      </select>
    </div>
    <!-- Line 1 -->
    <div class="flex flex-col gap-1">
      <label :for="ids.line1" class="text-xs font-medium text-foreground"
        >{{ locale.t('AddressEditor.addressLine1', undefined, 'Address line 1') }}
      </label>
      <input
        :id="ids.line1"
        type="text"
        autocomplete="address-line1"
        :value="address.line1"
        :disabled="isDisabled"
        :readonly="isReadOnly"
        :class="controlClass"
        @input="onFieldInput('line1', $event)"
      />
    </div>
    <!-- Line 2 -->
    <div class="flex flex-col gap-1">
      <label :for="ids.line2" class="text-xs font-medium text-muted-foreground">
        {{ locale.t('AddressEditor.addressLine2', undefined, 'Address line 2') }}
        <span class="text-[10px]">{{ locale.t('AddressEditor.optional', undefined, '(optional)') }} </span>
      </label>
      <input
        :id="ids.line2"
        type="text"
        autocomplete="address-line2"
        :value="address.line2 ?? ''"
        :disabled="isDisabled"
        :readonly="isReadOnly"
        :class="controlClass"
        @input="onFieldInput('line2', $event)"
      />
    </div>
    <!-- City + Region + Postal -->
    <div :class="gridClass">
      <div class="flex flex-col gap-1">
        <label :for="ids.city" class="text-xs font-medium text-foreground"
          >{{ locale.t('AddressEditor.city', undefined, 'City') }}
        </label>
        <input
          :id="ids.city"
          type="text"
          autocomplete="address-level2"
          :value="address.city"
          :disabled="isDisabled"
          :readonly="isReadOnly"
          :class="controlClass"
          @input="onFieldInput('city', $event)"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label :for="ids.region" class="text-xs font-medium text-foreground">
          {{ config.regionLabel }}
        </label>
        <select
          v-if="config.regionOptions"
          :id="ids.region"
          :value="address.region"
          :disabled="isDisabled || isReadOnly"
          :class="controlClass"
          @change="onRegionSelect"
        >
          <option value="">—</option>
          <option v-for="o in config.regionOptions" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </select>
        <input
          v-else
          :id="ids.region"
          type="text"
          autocomplete="address-level1"
          :value="address.region"
          :disabled="isDisabled"
          :readonly="isReadOnly"
          :class="controlClass"
          @input="onFieldInput('region', $event)"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label :for="ids.postal" class="text-xs font-medium text-foreground">
          {{ config.postalLabel }}
        </label>
        <input
          :id="ids.postal"
          type="text"
          autocomplete="postal-code"
          :value="address.postalCode"
          :disabled="isDisabled"
          :readonly="isReadOnly"
          :class="controlClass"
          @input="onFieldInput('postalCode', $event)"
        />
      </div>
    </div>
    <template v-if="name">
      <input
        type="hidden"
        :disabled="isDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}.country`"
        :value="address.country"
      />
      <input
        type="hidden"
        :disabled="isDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}.line1`"
        :value="address.line1"
      />
      <input
        type="hidden"
        :disabled="isDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}.line2`"
        :value="address.line2 ?? ''"
      />
      <input
        type="hidden"
        :disabled="isDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}.city`"
        :value="address.city"
      />
      <input
        type="hidden"
        :disabled="isDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}.region`"
        :value="address.region"
      />
      <input
        type="hidden"
        :disabled="isDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="`${name}.postalCode`"
        :value="address.postalCode"
      />
    </template>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
