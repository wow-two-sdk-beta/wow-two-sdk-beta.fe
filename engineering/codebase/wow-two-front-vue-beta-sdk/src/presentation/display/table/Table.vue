<script lang="ts">
/* `TableDensity` / `TableRadius` are imported here (not in `<script setup>`) so
   the one binding serves as both the type below and the runtime value used in
   `withDefaults`. */
import { TableDensity, TableRadius } from './TableContext';

export interface TableProps {
  readonly isStriped?: boolean;
  readonly isHoverable?: boolean;
  readonly density?: TableDensity;
  readonly isBare?: boolean;
  /** The corner radius of the scroll wrapper (ignored when `isBare`). */
  readonly radius?: TableRadius;

  /** Classes for the scroll wrapper (ignored when `isBare`). A fallthrough `class` lands on the inner `<table>`. */
  readonly containerClassName?: string;

  /**
   * Pins the header row on an opaque fill while the body scrolls under it — inside the wrapper (give it a height
   * through `containerClassName`), or inside the nearest scrolling ancestor when `isBare`.
   */
  readonly hasStickyHeader?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { TableKey, WrapperRadius, type TableContextValue } from './TableContext';

/**
 * Renders the table root and its scroll wrapper, sharing density and striping with its sections.
 *
 * `TableBody`, `TableCell` and `TableHeaderCell` therefore need no props of their own; `isBare` drops the wrapper.
 *
 * React attached the sections as `Table.Body` / `.Row` / … via `Object.assign`. An SFC's generated default export
 * cannot carry statics cleanly, so they ship as siblings: `TableHead`, `TableBody`, `TableFooter`, `TableRow`,
 * `TableHeaderCell`, `TableCell`, `TableCaption`.
 */
defineOptions({ name: 'Table', inheritAttrs: false });

/** The table sections — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<TableProps>(), {
  isStriped: false,
  isHoverable: false,
  density: TableDensity.Cozy,
  isBare: false,
  radius: TableRadius.Md,
  containerClassName: undefined,
  hasStickyHeader: false,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableElement>('el');

/* Live getters, not a snapshot — a density change on the root has to reach
   every already-mounted cell, which a plain object literal would not do. */
provide<TableContextValue>(TableKey, {
  get isStriped() {
    return props.isStriped;
  },
  get isHoverable() {
    return props.isHoverable;
  },
  get density() {
    return props.density;
  },
  get hasStickyHeader() {
    return props.hasStickyHeader;
  },
});

const classes = computed(() =>
  cn('w-full caption-bottom border-collapse text-left', attrs.class as string | undefined),
);

const containerClasses = computed(() =>
  cn('relative w-full overflow-x-auto border border-border', WrapperRadius[props.radius], props.containerClassName),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <table v-if="props.isBare" ref="el" v-bind="rest" :class="classes">
    <slot />
  </table>
  <div v-else :class="containerClasses">
    <table ref="el" v-bind="rest" :class="classes">
      <slot />
    </table>
  </div>
</template>
