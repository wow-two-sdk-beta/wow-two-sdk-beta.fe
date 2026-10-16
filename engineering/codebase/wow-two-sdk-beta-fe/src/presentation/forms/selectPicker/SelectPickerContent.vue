<script lang="ts">
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of the `SelectPickerContent`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are spelled
 * out here because the SFC compiler's type resolver cannot follow a
 * `VariantProps<typeof …>` base and fails the build on it while `vue-tsc` stays
 * green. The aliases below are the canonical ones from `foundation/styles`.
 */
export interface SelectPickerContentProps {
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

  /** The searchable state, rendering a search input above the items and filtering by label substring. */
  readonly isSearchable?: boolean;

  /** The placeholder of the search input. */
  readonly searchPlaceholder?: string;

  /** The label rendered when the search yields no matches. */
  readonly noResultsLabel?: string | number;

  /** Locks the surface width to the trigger's, truncating long items. Default `false`. */
  readonly hasTriggerWidth?: boolean;
  /** @deprecated Use `hasTriggerWidth`; this alias is removed next release. */
  readonly matchWidth?: boolean;
}

/** The navigation keys the search input forwards to the ListboxPicker keyboard handler. */
const ForwardedNavKeys = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp', 'Enter']);
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { computed, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { PopoverContent } from '../../overlays';
import ListboxPicker from '../listboxPicker/ListboxPicker.vue';
import ListboxPickerEmpty from '../listboxPicker/ListboxPickerEmpty.vue';
import SearchInput from '../searchInput/SearchInput.vue';
import { useSelectContext } from './SelectPickerContext';

const LoaderIcon = Loader2;

/** Renders the floating panel below the trigger — an optional search box over the listbox of options. */
defineOptions({ name: 'SelectPickerContent', inheritAttrs: false });

/** The item list — `SelectPickerItem`, `ListboxPickerGroup`, `ListboxPickerSeparator`. React's `children`. */
defineSlots<{ default(): unknown }>();

const inputProps = withDefaults(defineProps<SelectPickerContentProps>(), {
  isSearchable: false,

  hasTriggerWidth: undefined,
  matchWidth: undefined,
});
const props = useLocaleDefaults(inputProps, 'SelectPickerContent', {
  searchPlaceholder: 'Search…',
  noResultsLabel: 'No results',
});

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useSelectContext();

const visibleCount = computed(() =>
  ctx.query ? ctx.items.filter((i) => i.text.toLowerCase().includes(ctx.query.toLowerCase())).length : ctx.items.length,
);

const showEmpty = computed(() => visibleCount.value === 0);

const listbox = useTemplateRef<ComponentPublicInstance & { el?: HTMLElement | null }>('listbox');

/* Publishes the ListboxPicker's DOM node onto the context so the search input's keyboard bridge can
   re-dispatch nav keys onto it. React passed `ctx.listboxRef` straight in as a ref. */
watch(
  listbox,
  (instance) => {
    const node = (instance?.el ?? instance?.$el ?? null) as HTMLElement | null;
    ctx.listboxEl.value = node;
  },
  { immediate: true, flush: 'post' },
);

/* Bridges nav keys from the search input to the ListboxPicker by re-dispatching a bubbling
   KeyboardEvent onto the listbox node; printable chars stay in the input for filtering. The
   active-id change is mirrored back via the ListboxPicker's `active-change` after commit. */
function handleSearchKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    /* Let the popover's DismissableLayer close + restore focus to the trigger. */
    return;
  }
  if (!ForwardedNavKeys.has(event.key)) return;
  const node = ctx.listboxEl.value;
  if (!node) return;
  event.preventDefault();
  node.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, bubbles: true, cancelable: true }));
}

function onListboxValueChange(next: unknown): void {
  if (next === null || next === undefined) return;
  const entry = ctx.items.find((i) => ctx.keyEquals(i.itemKey, next));
  if (entry) ctx.onSelect(entry);
}

const contentClass = computed(() =>
  cn(
    'overflow-hidden',
    /* Truncate the option's first content child (the label) so trailing meta stays visible.
       Targets ListboxPickerItem's stable `data-listbox-item-content` wrapper rather than a deep
       `[role=option]>span.flex-1>:first-child` chain that breaks if the markup shifts. */
    (props.hasTriggerWidth ?? props.matchWidth ?? false)
      ? 'w-(--anchor-width) [&_[data-listbox-item-content]>:first-child]:truncate'
      : 'w-auto min-w-(--anchor-width)',
  ),
);

const selectedForListbox = computed(() => ctx.selectedKey ?? undefined);
</script>

<template>
  <PopoverContent
    :variant="variant"
    :tone="tone"
    :radius="radius"
    :padding="padding ?? 'none'"
    :elevation="elevation"
    v-bind="$attrs"
    :class="[contentClass, $attrs.class]"
  >
    <div v-if="isSearchable" class="border-b border-border p-1">
      <SearchInput
        size="sm"
        autofocus
        role="combobox"
        aria-expanded="true"
        :aria-controls="ctx.listboxId"
        :aria-activedescendant="ctx.activeDescendant ?? undefined"
        aria-autocomplete="list"
        :model-value="ctx.query"
        :placeholder="props.searchPlaceholder"
        is-clearable
        class="rounded-sm"
        @update:model-value="ctx.setQuery($event)"
        @keydown="handleSearchKeyDown"
        @clear="ctx.setQuery('')"
      />
    </div>
    <ListboxPicker
      ref="listbox"
      :id="ctx.listboxId"
      :model-value="selectedForListbox"
      :is-equal="ctx.keyEquals"
      :is-disabled="ctx.isDisabled || ctx.isLoading"
      variant="flat"
      radius="none"
      :tabindex="isSearchable ? -1 : 0"
      @update:modelValue="onListboxValueChange"
      @active-change="ctx.setActiveDescendant($event)"
    >
      <!--
        In-list loading affordance — visible when options resolve asynchronously while the panel
        is open (e.g. a dependent re-fetch). Suppresses the no-results message so a mid-load
        empty set doesn't read as "no results".
      -->
      <div v-if="ctx.isLoading" role="status" class="flex items-center gap-2 px-2 py-2 text-sm text-subtle-foreground">
        <LoaderIcon class="h-4 w-4 animate-spin" />
        <span>{{ ctx.loadingLabel }}</span>
      </div>
      <slot />
      <ListboxPickerEmpty v-if="!ctx.isLoading && showEmpty">{{ props.noResultsLabel }}</ListboxPickerEmpty>
    </ListboxPicker>
  </PopoverContent>
</template>
