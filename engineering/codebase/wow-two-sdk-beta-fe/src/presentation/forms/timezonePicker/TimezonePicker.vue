<script lang="ts">
import type { Temporal } from 'temporal-polyfill';
import type { SelectPickerSize } from '../selectPicker';

/** Defines props for the IANA time-zone picker. */
export interface TimezonePickerProps {
  /** The IANA zone id, controlled. The `v-model` binding target; `null` selects nothing. */
  readonly modelValue?: string | null;

  /** The initial zone id when uncontrolled. */
  readonly defaultValue?: string | null;

  /** The zone ids to offer. Default every zone the runtime supports, plus `UTC`. */
  readonly timeZones?: ReadonlyArray<string>;

  /** The instant whose UTC offsets label and order the zones. Default the moment the picker mounted. */
  readonly referenceInstant?: Temporal.Instant;

  /** The trigger text with no zone picked. Default `"Pick a time zone"`, localized. */
  readonly placeholder?: string;

  /** The search input placeholder. Default `"Search time zones…"`, localized. */
  readonly searchPlaceholder?: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The disabled state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value. */
  readonly isReadOnly?: boolean;

  /** The invalid state. */
  readonly isInvalid?: boolean;

  /** Whether the trigger offers a clear button. */
  readonly isClearable?: boolean;

  /** The hidden input name submitted with the form. */
  readonly name?: string;
}

/** @internal One offered zone, labelled and ordered by its offset. */
interface TimezoneOption {
  readonly itemKey: string;
  readonly value: string;
  readonly label: string;
  readonly offsetMinutes: number;
}

/** @internal The UTC offsets already resolved, keyed by zone and hour, so reopening re-reads nothing. */
const OffsetCache = new Map<string, number>();

/** @internal Every zone the runtime supports, with `UTC` first. */
function supportedTimeZones(): ReadonlyArray<string> {
  const listed = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return ['UTC', ...listed.filter((zone) => zone !== 'UTC')];
}

/** @internal The zone's UTC offset in minutes at an instant, or `null` for a zone the runtime rejects. */
function offsetMinutesOf(zone: string, at: number): number | null {
  const cacheKey = `${zone}@${Math.floor(at / 3_600_000)}`;
  const cached = OffsetCache.get(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const text =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
        .formatToParts(at)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(text);
    const minutes = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
    OffsetCache.set(cacheKey, minutes);
    return minutes;
  } catch {
    return null;
  }
}

/** @internal Formats an offset as `GMT+05:30`. */
function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  return `GMT${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { useLocaleDefaults } from '../../../foundation/i18n';
import {
  SelectPicker,
  SelectPickerContent,
  SelectPickerItem,
  SelectPickerTrigger,
  SelectPickerValue,
} from '../selectPicker';

/**
 * Renders a searchable picker of IANA time zones, each labelled with its UTC offset and ordered from the
 * westernmost offset east.
 */
defineOptions({ name: 'TimezonePicker', inheritAttrs: false });

const componentProps = withDefaults(defineProps<TimezonePickerProps>(), {
  modelValue: undefined,
  defaultValue: null,
  timeZones: undefined,
  referenceInstant: undefined,
  size: undefined,
  isDisabled: false,
  isReadOnly: false,
  isInvalid: false,
  isClearable: false,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'TimezonePicker', {
  placeholder: 'Pick a time zone',
  searchPlaceholder: 'Search time zones…',
});

const emit = defineEmits<{
  /** Fires when the reader picks or clears a zone — the `v-model` half. */
  'update:modelValue': [zone: string | null];
}>();

const attrs = useAttrs();

/** @internal The mount moment — the default reading instant, fixed so labels never shift while open. */
const mountedAt = Date.now();

/** The instant offsets are read at. */
const readAt = computed(() => props.referenceInstant?.epochMilliseconds ?? mountedAt);

/** The offered zones, labelled with their offsets and ordered west to east, then by name. */
const options = computed<ReadonlyArray<TimezoneOption>>(() =>
  [...new Set(props.timeZones ?? supportedTimeZones())]
    .flatMap((zone) => {
      const offset = offsetMinutesOf(zone, readAt.value);
      if (offset === null) return [];
      return [
        {
          itemKey: zone,
          value: zone,
          label: `${zone.replaceAll('_', ' ')} (${formatOffset(offset)})`,
          offsetMinutes: offset,
        },
      ];
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.itemKey.localeCompare(b.itemKey)),
);

/** Re-emits a pick from the inner picker. */
function handleUpdate(zone: string | null): void {
  emit('update:modelValue', zone);
}
</script>

<template>
  <SelectPicker
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :options="options"
    :name="props.name"
    :is-disabled="props.isDisabled"
    :is-read-only="props.isReadOnly"
    :is-invalid="props.isInvalid"
    :is-clearable="props.isClearable"
    @update:model-value="handleUpdate"
  >
    <SelectPickerTrigger :size="props.size" v-bind="attrs">
      <SelectPickerValue :placeholder="props.placeholder" />
    </SelectPickerTrigger>
    <SelectPickerContent is-searchable :search-placeholder="props.searchPlaceholder">
      <SelectPickerItem
        v-for="option in options"
        :key="option.itemKey"
        :item-key="option.itemKey"
        :value="option.value"
        :label="option.label"
      />
    </SelectPickerContent>
  </SelectPicker>
</template>
