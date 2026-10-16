import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the Heading visual size step (independent of semantic level). */
export const HeadingSize = {
  /** Refers to the extra-small step. */
  Xs: 'xs',
  /** Refers to the small step. */
  Sm: 'sm',
  /** Refers to the medium step. */
  Md: 'md',
  /** Refers to the large step. */
  Lg: 'lg',
  /** Refers to the extra-large step. */
  Xl: 'xl',
  /** Refers to the 2x-large step. */
  Xxl: '2xl',
  /** Refers to the 3x-large step. */
  Xxxl: '3xl',
  /** Refers to the 4x-large step. */
  Xxxxl: '4xl',
} as const;

export type HeadingSize = (typeof HeadingSize)[keyof typeof HeadingSize];

/** Defines the Heading font weight. */
export const HeadingWeight = {
  /** Refers to normal weight. */
  Normal: 'normal',
  /** Refers to medium weight. */
  Medium: 'medium',
  /** Refers to semibold weight. */
  Semibold: 'semibold',
  /** Refers to bold weight. */
  Bold: 'bold',
} as const;

export type HeadingWeight = (typeof HeadingWeight)[keyof typeof HeadingWeight];

/** Defines the Heading text alignment. */
export const HeadingAlign = {
  /** Refers to left alignment. */
  Left: 'left',
  /** Refers to centered alignment. */
  Center: 'center',
  /** Refers to right alignment. */
  Right: 'right',
} as const;

export type HeadingAlign = (typeof HeadingAlign)[keyof typeof HeadingAlign];

export const headingVariants = tv({
  base: 'font-semibold tracking-tight text-foreground',
  variants: {
    size: {
      xs: 'text-sm',
      sm: 'text-base',
      md: 'text-lg',
      lg: 'text-xl',
      xl: 'text-2xl',
      '2xl': 'text-3xl',
      '3xl': 'text-4xl',
      '4xl': 'text-5xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
  },
  defaultVariants: {
    size: 'lg',
    weight: 'semibold',
  },
});

export type HeadingVariants = VariantProps<typeof headingVariants>;

/* Compile-time lock: enum values ≡ tv size/weight/align value-sets (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertHeadingSize: AssertExact<HeadingSize, NonNullable<VariantProps<typeof headingVariants>['size']>> = true;
const _assertHeadingWeight: AssertExact<
  HeadingWeight,
  NonNullable<VariantProps<typeof headingVariants>['weight']>
> = true;
const _assertHeadingAlign: AssertExact<HeadingAlign, NonNullable<VariantProps<typeof headingVariants>['align']>> = true;
void _assertHeadingSize;
void _assertHeadingWeight;
void _assertHeadingAlign;
