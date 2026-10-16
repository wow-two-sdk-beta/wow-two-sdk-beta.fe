import { tv, type VariantProps } from '../../../foundation/styles';

export const gridVariants = tv({
  base: 'grid',
  variants: {
    columns: {
      '1': 'grid-cols-1',
      '2': 'grid-cols-2',
      '3': 'grid-cols-3',
      '4': 'grid-cols-4',
      '5': 'grid-cols-5',
      '6': 'grid-cols-6',
      '8': 'grid-cols-8',
      '12': 'grid-cols-12',
    },
    gap: {
      '0': 'gap-0',
      '1': 'gap-1',
      '2': 'gap-2',
      '3': 'gap-3',
      '4': 'gap-4',
      '5': 'gap-5',
      '6': 'gap-6',
      '8': 'gap-8',
      '10': 'gap-10',
      '12': 'gap-12',
    },
  },
  defaultVariants: {
    columns: '2',
    gap: '4',
  },
});

export type GridVariants = VariantProps<typeof gridVariants>;

/** Represents the scalar column count accepted by `Grid` (also the per-breakpoint value). */
export type GridColumns = NonNullable<GridVariants['columns']>;

/** Represents the scalar gap step accepted by `Grid` (also the per-breakpoint value). */
export type GridGap = NonNullable<GridVariants['gap']>;

/** Defines the responsive breakpoints `Grid` understands (`base` = unprefixed). */
export const GridBreakpoint = {
  /** Refers to the unprefixed (mobile-first) breakpoint. */
  Base: 'base',
  /** Refers to the `sm:` breakpoint. */
  Sm: 'sm',
  /** Refers to the `md:` breakpoint. */
  Md: 'md',
  /** Refers to the `lg:` breakpoint. */
  Lg: 'lg',
  /** Refers to the `xl:` breakpoint. */
  Xl: 'xl',
} as const;

export type GridBreakpoint = (typeof GridBreakpoint)[keyof typeof GridBreakpoint];

/**
 * Represents a responsive value for `columns` / `gap` — a per-breakpoint map.
 * `base` is the unprefixed value; the rest map to Tailwind's `sm:`–`xl:` prefixes.
 */
export type GridResponsive<T extends string> = Partial<Record<GridBreakpoint, T>>;

/* Tailwind can't see interpolated class names, so every responsive permutation
   is spelled out as a complete literal here (base + sm/md/lg/xl prefixes). */
const ColumnClasses: Record<GridBreakpoint, Record<GridColumns, string>> = {
  base: {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
    '5': 'grid-cols-5',
    '6': 'grid-cols-6',
    '8': 'grid-cols-8',
    '12': 'grid-cols-12',
  },
  sm: {
    '1': 'sm:grid-cols-1',
    '2': 'sm:grid-cols-2',
    '3': 'sm:grid-cols-3',
    '4': 'sm:grid-cols-4',
    '5': 'sm:grid-cols-5',
    '6': 'sm:grid-cols-6',
    '8': 'sm:grid-cols-8',
    '12': 'sm:grid-cols-12',
  },
  md: {
    '1': 'md:grid-cols-1',
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-3',
    '4': 'md:grid-cols-4',
    '5': 'md:grid-cols-5',
    '6': 'md:grid-cols-6',
    '8': 'md:grid-cols-8',
    '12': 'md:grid-cols-12',
  },
  lg: {
    '1': 'lg:grid-cols-1',
    '2': 'lg:grid-cols-2',
    '3': 'lg:grid-cols-3',
    '4': 'lg:grid-cols-4',
    '5': 'lg:grid-cols-5',
    '6': 'lg:grid-cols-6',
    '8': 'lg:grid-cols-8',
    '12': 'lg:grid-cols-12',
  },
  xl: {
    '1': 'xl:grid-cols-1',
    '2': 'xl:grid-cols-2',
    '3': 'xl:grid-cols-3',
    '4': 'xl:grid-cols-4',
    '5': 'xl:grid-cols-5',
    '6': 'xl:grid-cols-6',
    '8': 'xl:grid-cols-8',
    '12': 'xl:grid-cols-12',
  },
};

const GapClasses: Record<GridBreakpoint, Record<GridGap, string>> = {
  base: {
    '0': 'gap-0',
    '1': 'gap-1',
    '2': 'gap-2',
    '3': 'gap-3',
    '4': 'gap-4',
    '5': 'gap-5',
    '6': 'gap-6',
    '8': 'gap-8',
    '10': 'gap-10',
    '12': 'gap-12',
  },
  sm: {
    '0': 'sm:gap-0',
    '1': 'sm:gap-1',
    '2': 'sm:gap-2',
    '3': 'sm:gap-3',
    '4': 'sm:gap-4',
    '5': 'sm:gap-5',
    '6': 'sm:gap-6',
    '8': 'sm:gap-8',
    '10': 'sm:gap-10',
    '12': 'sm:gap-12',
  },
  md: {
    '0': 'md:gap-0',
    '1': 'md:gap-1',
    '2': 'md:gap-2',
    '3': 'md:gap-3',
    '4': 'md:gap-4',
    '5': 'md:gap-5',
    '6': 'md:gap-6',
    '8': 'md:gap-8',
    '10': 'md:gap-10',
    '12': 'md:gap-12',
  },
  lg: {
    '0': 'lg:gap-0',
    '1': 'lg:gap-1',
    '2': 'lg:gap-2',
    '3': 'lg:gap-3',
    '4': 'lg:gap-4',
    '5': 'lg:gap-5',
    '6': 'lg:gap-6',
    '8': 'lg:gap-8',
    '10': 'lg:gap-10',
    '12': 'lg:gap-12',
  },
  xl: {
    '0': 'xl:gap-0',
    '1': 'xl:gap-1',
    '2': 'xl:gap-2',
    '3': 'xl:gap-3',
    '4': 'xl:gap-4',
    '5': 'xl:gap-5',
    '6': 'xl:gap-6',
    '8': 'xl:gap-8',
    '10': 'xl:gap-10',
    '12': 'xl:gap-12',
  },
};

const BreakpointOrder: ReadonlyArray<GridBreakpoint> = ['base', 'sm', 'md', 'lg', 'xl'];

/** Resolves a scalar-or-responsive `columns` value to its complete Tailwind class string. */
export function resolveGridColumns(value: GridColumns | GridResponsive<GridColumns> | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return ColumnClasses.base[value];
  return BreakpointOrder.map((bp) => {
    const v = value[bp];
    return v === undefined ? undefined : ColumnClasses[bp][v];
  })
    .filter((c): c is string => Boolean(c))
    .join(' ');
}

/** Resolves a scalar-or-responsive `gap` value to its complete Tailwind class string. */
export function resolveGridGap(value: GridGap | GridResponsive<GridGap> | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return GapClasses.base[value];
  return BreakpointOrder.map((bp) => {
    const v = value[bp];
    return v === undefined ? undefined : GapClasses[bp][v];
  })
    .filter((c): c is string => Boolean(c))
    .join(' ');
}
