<script lang="ts">
/* `TableDensity` / `TableRadius` / `TablePhoneLayout` are imported here (not in `<script setup>`) so
   the one binding serves as both the type below and the runtime value used in
   `withDefaults`. */
import type { Breakpoint } from '../../layout/appShell/AppShell.vue';
import { TableDensity, TablePhoneLayout, TableRadius } from './TableContext';

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

  /**
   * The layout below `stackBreakpoint`. Default `stack`: one card per row, each cell beside its column label (read
   * from the header). `scroll` keeps the table and scrolls it sideways inside the wrapper.
   */
  readonly phoneLayout?: TablePhoneLayout;

  /** Rows stack into cards below this breakpoint. Default `md`. */
  readonly stackBreakpoint?: Breakpoint;
}

/** The direct children of `parent` with one of `tags` — never a nested table's parts. */
function childrenOf(parent: Element, tags: ReadonlyArray<string>): Element[] {
  return [...parent.children].filter((child) => tags.includes(child.tagName));
}

function spanOf(cell: Element): number {
  return Math.max(1, Number(cell.getAttribute('colspan')) || 1);
}

/** The header text a body cell's label repeats: the last header row, one entry per spanned column. */
function headerLabels(table: Element): string[] {
  const row = childrenOf(table, ['THEAD'])
    .flatMap((head) => childrenOf(head, ['TR']))
    .at(-1);
  if (!row) return [];
  return childrenOf(row, ['TH', 'TD']).flatMap((cell) => {
    const text = (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
    return Array.from({ length: spanOf(cell) }, () => text);
  });
}

/**
 * Writes each body and footer cell's `data-label` from its column header. A cell given its own `label` carries
 * `data-fixed-label` and is left alone; a cell spanning columns gets none. Only changed attributes are written.
 */
function syncCellLabels(table: Element): void {
  const labels = headerLabels(table);
  const rows = childrenOf(table, ['TBODY', 'TFOOT']).flatMap((section) => childrenOf(section, ['TR']));
  for (const row of rows) {
    let column = 0;
    for (const cell of childrenOf(row, ['TD', 'TH'])) {
      const span = spanOf(cell);
      if (!cell.hasAttribute('data-fixed-label')) {
        const label = span === 1 ? (labels[column] ?? '') : '';
        if (!label) cell.removeAttribute('data-label');
        else if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
      }
      column += span;
    }
  }
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { TableKey, WrapperRadius, stackAttribute, stackRole, type TableContextValue } from './TableContext';

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
  phoneLayout: TablePhoneLayout.Stack,
  stackBreakpoint: 'md',
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLTableElement>('el');

/* Live getters, not a snapshot — a density change on the root has to reach
   every already-mounted cell, which a plain object literal would not do. */
const context: TableContextValue = {
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
  get phoneLayout() {
    return props.phoneLayout;
  },
  get stackBreakpoint() {
    return props.stackBreakpoint;
  },
};
provide<TableContextValue>(TableKey, context);

const stack = computed(() => stackAttribute(context));

const classes = computed(() =>
  cn('w-full caption-bottom border-collapse text-left table-stacked:block', attrs.class as string | undefined),
);

/* Stacked rows are cards of their own, so the wrapper drops its frame. */
const containerClasses = computed(() =>
  cn(
    'relative w-full overflow-x-auto border border-border',
    WrapperRadius[props.radius],
    'table-stacked:rounded-none table-stacked:border-0',
    props.containerClassName,
  ),
);

/* Cell labels follow the header: re-read after any change to the rows or the header text. The observer already
   batches one render's mutations into a single call, and the attributes it writes are not observed. */
let observer: MutationObserver | null = null;

function stopSync(): void {
  observer?.disconnect();
  observer = null;
}

function startSync(): void {
  stopSync();
  const table = el.value;
  if (!table || stack.value === undefined || typeof MutationObserver === 'undefined') return;
  syncCellLabels(table);
  observer = new MutationObserver(() => syncCellLabels(table));
  observer.observe(table, { childList: true, subtree: true, characterData: true });
}

onMounted(startSync);
watch([stack, () => props.isBare], startSync, { flush: 'post' });
onBeforeUnmount(stopSync);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <table
    v-if="props.isBare"
    ref="el"
    :role="stackRole(context, 'table')"
    :data-stack="stack"
    v-bind="rest"
    :class="classes"
  >
    <slot />
  </table>
  <div v-else :data-stack="stack" :class="containerClasses">
    <table ref="el" :role="stackRole(context, 'table')" :data-stack="stack" v-bind="rest" :class="classes">
      <slot />
    </table>
  </div>
</template>
