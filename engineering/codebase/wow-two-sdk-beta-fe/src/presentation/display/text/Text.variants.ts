import { tv, Size, type VariantProps } from '../../../foundation/styles';

/** Defines the Text font weight. */
export const TextWeight = {
  /** Refers to normal weight. */
  Normal: 'normal',
  /** Refers to medium weight. */
  Medium: 'medium',
  /** Refers to semibold weight. */
  Semibold: 'semibold',
  /** Refers to bold weight. */
  Bold: 'bold',
} as const;

export type TextWeight = (typeof TextWeight)[keyof typeof TextWeight];

/** Defines the Text color role. */
export const TextColor = {
  /** Refers to the default foreground. */
  Default: 'default',
  /** Refers to the muted foreground. */
  Muted: 'muted',
  /** Refers to the subtle foreground. */
  Subtle: 'subtle',
  /** Refers to the primary brand color. */
  Brand: 'brand',
  /** Refers to the positive / confirmation color. */
  Success: 'success',
  /** Refers to the caution color. */
  Warning: 'warning',
  /** Refers to the destructive / error color. */
  Danger: 'danger',
  /** Refers to the informational color. */
  Info: 'info',
} as const;

export type TextColor = (typeof TextColor)[keyof typeof TextColor];

/** Defines the Text alignment. */
export const TextAlign = {
  /** Refers to left alignment. */
  Left: 'left',
  /** Refers to centered alignment. */
  Center: 'center',
  /** Refers to right alignment. */
  Right: 'right',
  /** Refers to justified alignment. */
  Justify: 'justify',
} as const;

export type TextAlign = (typeof TextAlign)[keyof typeof TextAlign];

export const textVariants = tv({
  base: '',
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    color: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      subtle: 'text-subtle-foreground',
      brand: 'text-primary-soft-foreground',
      success: 'text-success-soft-foreground',
      warning: 'text-warning-soft-foreground',
      danger: 'text-destructive-soft-foreground',
      info: 'text-info-soft-foreground',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
    isTruncated: {
      true: 'truncate',
    },
    isTabular: {
      true: 'tabular-nums',
    },
  },
  defaultVariants: {
    size: 'md',
    weight: 'normal',
    color: 'default',
  },
});

export type TextVariants = VariantProps<typeof textVariants>;

/* Compile-time lock: enum values ≡ tv size/weight/color/align value-sets (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertTextSize: AssertExact<Size, NonNullable<VariantProps<typeof textVariants>['size']>> = true;
const _assertTextWeight: AssertExact<TextWeight, NonNullable<VariantProps<typeof textVariants>['weight']>> = true;
const _assertTextColor: AssertExact<TextColor, NonNullable<VariantProps<typeof textVariants>['color']>> = true;
const _assertTextAlign: AssertExact<TextAlign, NonNullable<VariantProps<typeof textVariants>['align']>> = true;
void _assertTextSize;
void _assertTextWeight;
void _assertTextColor;
void _assertTextAlign;
