<script lang="ts">
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of `MultiSelectPickerContent`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are spelled out here
 * because the SFC compiler's type resolver cannot follow a `VariantProps<typeof …>` base and
 * fails the build on it. The aliases below are the canonical ones from `foundation/styles`,
 * already locked against the `surfaceVariants` config there, so the two cannot drift.
 */
export interface MultiSelectPickerContentProps {
  /** The visual recipe. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Defaults to `none`. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;

  /** Enables search across the option labels. */
  readonly isSearchable?: boolean;

  /** The placeholder and accessible name of the search field. */
  readonly searchPlaceholder?: string;
}

const navigationKeys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Enter']);
</script>

<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { PopoverContent } from '../../overlays';
import { ListboxPicker } from '../listboxPicker';
import { OptionCollection } from '../OptionCollection';
import SearchInput from '../searchInput/SearchInput.vue';
import { multiSelectSearchKey, useMultiSelectContext } from './MultiSelectPickerContext';

/** Renders the floating panel below the trigger, hosting the rows as a multi-selection listbox. */
defineOptions({ name: 'MultiSelectPickerContent', inheritAttrs: false });

/** The `MultiSelectPickerItem` rows — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<MultiSelectPickerContentProps>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useMultiSelectContext();
const query = shallowRef('');
const activeOption = shallowRef<string | undefined>();
const listbox = useTemplateRef<InstanceType<typeof ListboxPicker>>('listbox');
provide(
  multiSelectSearchKey,
  computed(() => (props.isSearchable ? query.value.trim().toLowerCase() : '')),
);

watch(
  () => ctx.open,
  (open) => {
    if (open) return;
    query.value = '';
    activeOption.value = undefined;
  },
);

const resolvedPadding = computed(() => props.padding ?? 'none');

const panelClass = computed(() => cn('w-auto min-w-[var(--anchor-width)] overflow-hidden', attrs.class as ClassValue));

const selected = computed(() => ctx.values);

function onValueChange(next: unknown): void {
  ctx.setValues(next as ReadonlyArray<string>);
}

function navigateFromSearch(event: KeyboardEvent): void {
  const element = listbox.value?.el;
  if (event.isComposing || !navigationKeys.has(event.key) || !element) return;
  event.preventDefault();
  element.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, bubbles: true, cancelable: true }));
}
</script>

<template>
  <PopoverContent
    :variant="variant"
    :tone="tone"
    :radius="radius"
    :padding="resolvedPadding"
    :elevation="elevation"
    :class="panelClass"
  >
    <div v-if="isSearchable" class="border-b border-border p-1">
      <SearchInput
        v-model="query"
        size="sm"
        autofocus
        role="combobox"
        aria-expanded="true"
        aria-autocomplete="list"
        :aria-controls="ctx.listboxId"
        :aria-activedescendant="activeOption"
        :aria-label="searchPlaceholder ?? 'Search…'"
        :placeholder="searchPlaceholder ?? 'Search…'"
        is-clearable
        @keydown="navigateFromSearch"
      />
    </div>
    <ListboxPicker
      ref="listbox"
      :id="ctx.listboxId"
      :is-disabled="ctx.isDisabled"
      is-multiple
      :model-value="selected"
      variant="flat"
      radius="none"
      :tabindex="isSearchable ? -1 : 0"
      @update:modelValue="onValueChange"
      @active-change="activeOption = $event ?? undefined"
    >
      <slot />
    </ListboxPicker>
  </PopoverContent>
  <!-- The closed panel's rows, mounted off-document so the tags label the selection before the first open. -->
  <OptionCollection :is-active="!ctx.open"><slot /></OptionCollection>
</template>
