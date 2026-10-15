import { inject, type InjectionKey } from 'vue';

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

/** The density / striping state a `Table` root shares with its sections and cells. */
export interface TableContextValue {
  isStriped: boolean;
  isHoverable: boolean;
  density: TableDensity;
  /** Whether `TableHead` pins itself to the top of the scroll container. */
  hasStickyHeader: boolean;
}

export const TableKey: InjectionKey<TableContextValue> = Symbol('wow-two.table');

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
