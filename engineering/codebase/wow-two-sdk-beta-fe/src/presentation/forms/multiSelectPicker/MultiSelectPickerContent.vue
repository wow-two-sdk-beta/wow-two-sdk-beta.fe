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
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { PopoverContent } from '../../overlays';
import { ListboxPicker } from '../listboxPicker';
import { useMultiSelectContext } from './MultiSelectPickerContext';

/** Renders the floating panel below the trigger, hosting the rows as a multi-selection listbox. */
defineOptions({ name: 'MultiSelectPickerContent', inheritAttrs: false });

/** The `MultiSelectPickerItem` rows — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<MultiSelectPickerContentProps>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useMultiSelectContext();

const resolvedPadding = computed(() => props.padding ?? 'none');

const panelClass = computed(() => cn('w-auto min-w-[var(--anchor-width)] overflow-hidden', attrs.class as ClassValue));

const selected = computed(() => ctx.values);

function onValueChange(next: unknown): void {
  ctx.setValues(next as ReadonlyArray<string>);
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
    <ListboxPicker
      :is-disabled="ctx.isDisabled"
      is-multiple
      :model-value="selected"
      variant="flat"
      radius="none"
      @update:modelValue="onValueChange"
    >
      <slot />
    </ListboxPicker>
  </PopoverContent>
</template>
