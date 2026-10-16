import { ProgressTone, Size, tv, type VariantProps } from '../../../foundation/styles';

export const progressTrackVariants = tv({
  base: 'h-2 w-full overflow-hidden rounded-full bg-muted',
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const progressFillVariants = tv({
  base: 'h-full rounded-full transition-[width] duration-300',
  variants: {
    tone: {
      brand: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-destructive',
      neutral: 'bg-muted-foreground',
    },
  },
  defaultVariants: {
    tone: 'brand',
  },
});

export type ProgressBarVariants = VariantProps<typeof progressTrackVariants> &
  VariantProps<typeof progressFillVariants>;

/* Compile-time lock: adopted enum values ≡ tv axis keys (drift = type error).
   `Size` is the 5-member registry enum; the track only wires 3 (sm/md/lg), so
   the assert is one-directional (tv keys ⊆ Size) — widening a narrower prop is
   allowed for beta. */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertProgressSize: NonNullable<VariantProps<typeof progressTrackVariants>['size']> extends Size ? true : never =
  true;
void _assertProgressSize;
const _assertProgressTone: AssertExact<
  ProgressTone,
  NonNullable<VariantProps<typeof progressFillVariants>['tone']>
> = true;
void _assertProgressTone;
