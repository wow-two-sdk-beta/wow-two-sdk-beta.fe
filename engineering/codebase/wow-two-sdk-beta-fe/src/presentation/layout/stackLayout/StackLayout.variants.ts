import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the flex main-axis direction of a `StackLayout`. */
export const StackLayoutDirection = {
  /** Refers to a left-to-right row. */
  Row: 'row',
  /** Refers to a top-to-bottom column. */
  Column: 'column',
  /** Refers to a right-to-left row. */
  RowReverse: 'row-reverse',
  /** Refers to a bottom-to-top column. */
  ColumnReverse: 'column-reverse',
} as const;

export type StackLayoutDirection = (typeof StackLayoutDirection)[keyof typeof StackLayoutDirection];

/** Defines the cross-axis alignment of `StackLayout` children. */
export const StackLayoutAlign = {
  /** Refers to alignment at the cross-axis start. */
  Start: 'start',
  /** Refers to centered cross-axis alignment. */
  Center: 'center',
  /** Refers to alignment at the cross-axis end. */
  End: 'end',
  /** Refers to stretching children to fill the cross axis. */
  Stretch: 'stretch',
  /** Refers to baseline alignment of children. */
  Baseline: 'baseline',
} as const;

export type StackLayoutAlign = (typeof StackLayoutAlign)[keyof typeof StackLayoutAlign];

/** Defines the main-axis distribution of `StackLayout` children. */
export const StackLayoutJustify = {
  /** Refers to packing children at the main-axis start. */
  Start: 'start',
  /** Refers to centering children on the main axis. */
  Center: 'center',
  /** Refers to packing children at the main-axis end. */
  End: 'end',
  /** Refers to equal space between children. */
  Between: 'between',
  /** Refers to equal space around each child. */
  Around: 'around',
  /** Refers to equal space between and around children. */
  Evenly: 'evenly',
} as const;

export type StackLayoutJustify = (typeof StackLayoutJustify)[keyof typeof StackLayoutJustify];

/** Defines how `StackLayout` children wrap onto multiple lines. */
export const StackLayoutWrap = {
  /** Refers to wrapping children onto new lines. */
  Wrap: 'wrap',
  /** Refers to keeping children on a single line. */
  Nowrap: 'nowrap',
  /** Refers to wrapping children onto new lines in reverse order. */
  WrapReverse: 'wrap-reverse',
} as const;

export type StackLayoutWrap = (typeof StackLayoutWrap)[keyof typeof StackLayoutWrap];

export const stackVariants = tv({
  base: 'flex',
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'column-reverse': 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
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
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      'wrap-reverse': 'flex-wrap-reverse',
    },
  },
  defaultVariants: {
    direction: 'column',
    gap: '4',
  },
});

export type StackLayoutVariants = VariantProps<typeof stackVariants>;

/* Compile-time lock: enum values ≡ tv variant keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertStackDirection: AssertExact<
  StackLayoutDirection,
  NonNullable<VariantProps<typeof stackVariants>['direction']>
> = true;
const _assertStackAlign: AssertExact<StackLayoutAlign, NonNullable<VariantProps<typeof stackVariants>['align']>> = true;
const _assertStackJustify: AssertExact<
  StackLayoutJustify,
  NonNullable<VariantProps<typeof stackVariants>['justify']>
> = true;
const _assertStackWrap: AssertExact<StackLayoutWrap, NonNullable<VariantProps<typeof stackVariants>['wrap']>> = true;
void _assertStackDirection;
void _assertStackAlign;
void _assertStackJustify;
void _assertStackWrap;
