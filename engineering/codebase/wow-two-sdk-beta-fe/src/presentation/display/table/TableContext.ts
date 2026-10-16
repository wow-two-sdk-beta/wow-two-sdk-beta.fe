import { inject, type InjectionKey } from 'vue';
import type { Breakpoint } from '../../layout/appShell/AppShell.vue';

/** Defines the Table row density. */
export const TableDensity = {
  /** Refers to the tightest padding. */
  Compact: 'compact',
  /** Refers to the default padding. */
  Cozy: 'cozy',
  /** Refers to relaxed padding. */
  Comfortable: 'comfortable',
  /** Refers to the roomiest padding. */
  Roomy: 'roomy',
} as const;

export type TableDensity = (typeof TableDensity)[keyof typeof TableDensity];

/** Defines the corner radius applied to the Table scroll wrapper. */
export const TableRadius = {
  /** Refers to square corners. */
  None: 'none',
  /** Refers to a small radius. */
  Sm: 'sm',
  /** Refers to a medium radius. */
  Md: 'md',
  /** Refers to a large radius. */
  Lg: 'lg',
  /** Refers to an extra-large radius. */
  Xl: 'xl',
  /** Refers to a 2x-large radius. */
  Xxl: '2xl',
} as const;

export type TableRadius = (typeof TableRadius)[keyof typeof TableRadius];

/** Defines how a `Table` lays out below its `stackBreakpoint`. */
export const TablePhoneLayout = {
  /** Refers to one card per row, each cell beside its column label. */
  Stack: 'stack',
  /** Refers to the full table, scrolling sideways inside its wrapper. */
  Scroll: 'scroll',
} as const;

export type TablePhoneLayout = (typeof TablePhoneLayout)[keyof typeof TablePhoneLayout];

/** The density / striping state a `Table` root shares with its sections and cells. */
export interface TableContextValue {
  isStriped: boolean;
  isHoverable: boolean;
  density: TableDensity;
  /** Whether `TableHead` pins itself to the top of the scroll container. */
  hasStickyHeader: boolean;
  /** The layout below `stackBreakpoint`. */
  phoneLayout: TablePhoneLayout;
  /** Rows stack into cards below this breakpoint when `phoneLayout` is `stack`. */
  stackBreakpoint: Breakpoint;
}

export const TableKey: InjectionKey<TableContextValue> = Symbol('wow-two.table');

/** Defines the table section a row or cell renders in. */
export const TableSection = {
  /** Refers to `thead`. */
  Head: 'head',
  /** Refers to `tbody`. */
  Body: 'body',
  /** Refers to `tfoot`. */
  Foot: 'foot',
} as const;

export type TableSection = (typeof TableSection)[keyof typeof TableSection];

export const TableSectionKey: InjectionKey<TableSection> = Symbol('wow-two.tableSection');

/** Reads the section a row or cell renders in; body when no section provides one. */
export function useTableSection(): TableSection {
  return inject(TableSectionKey, TableSection.Body);
}

/**
 * The fallback used when a section or cell renders outside a `Table` root —
 * React's `createContext` default value, preserved so a stray `<TableCell>`
 * still picks the cozy padding rather than throwing.
 */
export const DefaultTableContext: TableContextValue = {
  isStriped: false,
  isHoverable: false,
  density: TableDensity.Cozy,
  hasStickyHeader: false,
  phoneLayout: TablePhoneLayout.Scroll,
  stackBreakpoint: 'md',
};

/** Reads the enclosing `Table` state, falling back to the cozy defaults. */
export function useTableContext(): TableContextValue {
  return inject(TableKey, DefaultTableContext);
}

export const DensityCell: Record<TableDensity, string> = {
  compact: 'px-2 py-1.5 text-sm',
  cozy: 'px-3 py-2 text-sm',
  comfortable: 'px-4 py-3 text-sm',
  roomy: 'px-5 py-4 text-sm',
};

export const WrapperRadius: Record<TableRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

/**
 * The `data-stack` value every part carries while its table stacks — the breakpoint key the `table-stacked:` variant
 * (in `index.css`) matches — or `undefined` when the table keeps scrolling.
 */
export function stackAttribute(table: TableContextValue): Breakpoint | undefined {
  return table.phoneLayout === TablePhoneLayout.Stack ? table.stackBreakpoint : undefined;
}

/** The ARIA role a stacking part restates: CSS that unbuilds the table drops the native role in some engines. */
export function stackRole(table: TableContextValue, role: string): string | undefined {
  return table.phoneLayout === TablePhoneLayout.Stack ? role : undefined;
}

/**
 * A body or footer cell below the stack breakpoint: a row of label, then value. The label is generated content, so
 * it stays out of `textContent`; assistive technology reads it with the value, which names the value in a swipe
 * through the cards. CSS alternative text would silence it, but test tooling misreads that syntax.
 */
export const StackedCellClass = [
  'table-stacked:flex table-stacked:items-baseline table-stacked:gap-3 table-stacked:py-1',
  'table-stacked:[overflow-wrap:anywhere]',
  'table-stacked:data-label:before:content-[attr(data-label)]',
  'table-stacked:data-label:before:w-2/5 table-stacked:data-label:before:shrink-0',
  'table-stacked:data-label:before:text-start table-stacked:data-label:before:text-xs',
  'table-stacked:data-label:before:font-medium table-stacked:data-label:before:text-muted-foreground',
].join(' ');

/** Hides a header part that holds no control below the stack breakpoint; its text stays for assistive technology. */
export const StackedPassiveHeaderClass =
  'table-stacked:[&:not(:has(button,input,select,textarea,a[href],[tabindex]))]:sr-only';
