import { tv, OverlayPosition, type VariantProps } from '../../../foundation/styles';

/** Defines the FabButton's visual surface style. */
export const FabButtonVariant = {
  /** Refers to the primary brand-filled surface. */
  Primary: 'primary',
  /** Refers to the neutral card surface with a hairline border. */
  Secondary: 'secondary',
  /** Refers to the destructive / error-filled surface. */
  Destructive: 'destructive',
} as const;

export type FabButtonVariant = (typeof FabButtonVariant)[keyof typeof FabButtonVariant];

/** Defines the FabButton's diameter. */
export const FabButtonSize = {
  /** Refers to the small (2.5rem) diameter. */
  Sm: 'sm',
  /** Refers to the medium (3.5rem) default diameter. */
  Md: 'md',
  /** Refers to the large (4rem) diameter. */
  Lg: 'lg',
} as const;

export type FabButtonSize = (typeof FabButtonSize)[keyof typeof FabButtonSize];

export const fabVariants = tv({
  base: 'fixed inline-flex items-center justify-center rounded-full shadow-lg transition-all hover:shadow-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-card text-card-foreground border border-border hover:bg-muted',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    size: {
      sm: 'h-10 w-10',
      md: 'h-14 w-14',
      lg: 'h-16 w-16',
    },
    position: {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6',
      'top-center': 'top-6 left-1/2 -translate-x-1/2',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    position: 'bottom-right',
  },
});

export type FabButtonVariants = VariantProps<typeof fabVariants>;

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertFabVariant: AssertExact<FabButtonVariant, NonNullable<FabButtonVariants['variant']>> = true;
const _assertFabSize: AssertExact<FabButtonSize, NonNullable<FabButtonVariants['size']>> = true;
const _assertFabPosition: AssertExact<OverlayPosition, NonNullable<FabButtonVariants['position']>> = true;
void _assertFabVariant;
void _assertFabSize;
void _assertFabPosition;
