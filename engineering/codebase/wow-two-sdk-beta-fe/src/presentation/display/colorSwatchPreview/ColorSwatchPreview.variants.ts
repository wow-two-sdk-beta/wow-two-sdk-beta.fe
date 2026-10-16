import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the outline shape of a color swatch. */
export const SwatchShape = {
  /** Refers to a rounded-square swatch. */
  Square: 'square',
  /** Refers to a circular swatch. */
  Circle: 'circle',
} as const;

export type SwatchShape = (typeof SwatchShape)[keyof typeof SwatchShape];

/** Defines the size step of a color swatch. */
export const ColorSwatchPreviewSize = {
  /** Refers to the extra-small step (h-4). */
  Xs: 'xs',
  /** Refers to the small step (h-5). */
  Sm: 'sm',
  /** Refers to the medium (default) step (h-6). */
  Md: 'md',
  /** Refers to the large step (h-9). */
  Lg: 'lg',
} as const;

export type ColorSwatchPreviewSize = (typeof ColorSwatchPreviewSize)[keyof typeof ColorSwatchPreviewSize];

export const colorSwatchVariants = tv({
  base: 'inline-block shrink-0 border border-border bg-[image:linear-gradient(45deg,_#ddd_25%,_transparent_25%),_linear-gradient(-45deg,_#ddd_25%,_transparent_25%),_linear-gradient(45deg,_transparent_75%,_#ddd_75%),_linear-gradient(-45deg,_transparent_75%,_#ddd_75%)] bg-[length:8px_8px] bg-[position:0_0,_0_4px,_4px_-4px,_-4px_0px]',
  variants: {
    size: {
      xs: 'h-4 w-4',
      sm: 'h-5 w-5',
      md: 'h-6 w-6',
      lg: 'h-9 w-9',
    },
    shape: {
      square: 'rounded-sm',
      circle: 'rounded-full',
    },
    interactive: {
      true: 'cursor-pointer transition-shadow focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:shadow-sm',
      false: '',
    },
    isSelected: {
      true: 'ring-2 ring-ring ring-offset-1',
      false: '',
    },
    isDisabled: {
      true: 'cursor-not-allowed opacity-50',
      false: '',
    },
  },
  defaultVariants: {
    size: 'md',
    shape: 'square',
    interactive: false,
    isSelected: false,
    isDisabled: false,
  },
});

export type ColorSwatchPreviewVariants = VariantProps<typeof colorSwatchVariants>;

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertColorSwatchSize: AssertExact<
  ColorSwatchPreviewSize,
  NonNullable<VariantProps<typeof colorSwatchVariants>['size']>
> = true;
const _assertSwatchShape: AssertExact<
  SwatchShape,
  NonNullable<VariantProps<typeof colorSwatchVariants>['shape']>
> = true;
void _assertColorSwatchSize;
void _assertSwatchShape;
