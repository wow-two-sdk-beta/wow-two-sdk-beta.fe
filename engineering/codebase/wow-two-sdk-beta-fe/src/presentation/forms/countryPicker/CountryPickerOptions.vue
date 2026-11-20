<script lang="ts">
import type { CountryOption } from './CountryPickerExtensions';

/** Defines props for the rows of a `CountryPicker`. */
export interface CountryPickerOptionsProps {
  /** The countries listed first, in the order given. */
  readonly preferred: ReadonlyArray<CountryOption>;

  /** The remaining countries, in the order given. */
  readonly rest: ReadonlyArray<CountryOption>;
}
</script>

<script setup lang="ts">
import { ListboxPickerSeparator } from '../listboxPicker';
import { SelectPickerItem } from '../selectPicker';
import { useSelectContext } from '../selectPicker/SelectPickerContext';

/** Renders the option rows of a `CountryPicker`, with a rule between the preferred ones and the rest. */
defineOptions({ name: 'CountryPickerOptions' });

defineProps<CountryPickerOptionsProps>();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useSelectContext();
</script>

<template>
  <SelectPickerItem
    v-for="option in preferred"
    :key="option.code"
    :item-key="option.code"
    :value="option.code"
    :label="option.label"
    :text="option.text"
  >
    <span class="inline-flex min-w-0 items-center gap-2">
      <span aria-hidden="true">{{ option.flag }}</span>
      <span class="truncate">{{ option.name }}</span>
    </span>
  </SelectPickerItem>
  <!-- The rule only divides a full list: a search narrows both sides, and a rule beside nothing is noise. -->
  <ListboxPickerSeparator v-if="preferred.length > 0 && rest.length > 0 && !ctx.query" />
  <SelectPickerItem
    v-for="option in rest"
    :key="option.code"
    :item-key="option.code"
    :value="option.code"
    :label="option.label"
    :text="option.text"
  >
    <span class="inline-flex min-w-0 items-center gap-2">
      <span aria-hidden="true">{{ option.flag }}</span>
      <span class="truncate">{{ option.name }}</span>
    </span>
  </SelectPickerItem>
</template>
