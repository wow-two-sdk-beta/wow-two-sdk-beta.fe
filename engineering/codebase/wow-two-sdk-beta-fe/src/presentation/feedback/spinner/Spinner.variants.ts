import { Size, tv, type VariantProps } from '../../../foundation/styles';

/** Defines the Spinner color tone. */
export const SpinnerTone = {
  /** Refers to the default muted-foreground tone. */
  Default: 'default',
  /** Refers to the brand / primary tone. */
  Brand: 'brand',
  /** Refers to the low-emphasis border tone. */
  Muted: 'muted',
  /** Refers to inheriting the current text color. */
  Current: 'current',
} as const;

export type SpinnerTone = (typeof SpinnerTone)[keyof typeof SpinnerTone];

export const spinnerVariants = tv({
  base: 'inline-block animate-spin rounded-full border-current border-b-transparent',
  variants: {
    size: {
      xs: 'h-3 w-3 border',
      sm: 'h-4 w-4 border-2',
      md: 'h-5 w-5 border-2',
      lg: 'h-8 w-8 border-2',
      xl: 'h-12 w-12 border-[3px]',
    },
    tone: {
      default: 'text-muted-foreground',
      brand: 'text-primary',
      muted: 'text-border',
      current: '',
    },
  },
  defaultVariants: {
    size: 'md',
    tone: 'default',
  },
});

export type SpinnerVariants = VariantProps<typeof spinnerVariants>;

/* Compile-time lock: adopted/local enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSpinnerSize: AssertExact<Size, NonNullable<VariantProps<typeof spinnerVariants>['size']>> = true;
void _assertSpinnerSize;
const _assertSpinnerTone: AssertExact<SpinnerTone, NonNullable<VariantProps<typeof spinnerVariants>['tone']>> = true;
void _assertSpinnerTone;
