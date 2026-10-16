import { tv, type VariantProps } from '../../../foundation/styles';
import { inputBaseVariants } from '../InputStyles';

/** Defines the size step of a select trigger. */
export const SelectPickerSize = {
  /** Refers to the extra-small step. */
  Xs: 'xs',
  /** Refers to the small step. */
  Sm: 'sm',
  /** Refers to the medium (default) step. */
  Md: 'md',
  /** Refers to the large step. */
  Lg: 'lg',
} as const;

export type SelectPickerSize = (typeof SelectPickerSize)[keyof typeof SelectPickerSize];

/**
 * Extends the shared `inputBaseVariants` so the trigger's height, border,
 * focus-ring, disabled, and per-size paddings stay in lockstep with `TextInput`.
 * Only trigger-specific extras are added here:
 * - `justify-between` + `gap-2` to push the chevron/clear cluster to the end,
 * - `data-[state=open]:border-border-strong` to mirror the hover border while open.
 */
export const selectTriggerVariants = tv({
  extend: inputBaseVariants,
  base: 'items-center justify-between gap-2 data-[state=open]:border-border-strong',
  variants: {
    size: {
      xs: 'gap-1.5',
      sm: '',
      md: '',
      lg: '',
    },
  },
});

export type SelectPickerTriggerVariants = VariantProps<typeof selectTriggerVariants>;

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSelectSize: AssertExact<
  SelectPickerSize,
  NonNullable<VariantProps<typeof selectTriggerVariants>['size']>
> = true;
void _assertSelectSize;
