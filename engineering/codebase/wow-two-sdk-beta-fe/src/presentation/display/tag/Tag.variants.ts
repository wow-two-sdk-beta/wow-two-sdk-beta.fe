import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the Tag color treatment. */
export const TagVariant = {
  /** Refers to the neutral bordered chip. */
  Neutral: 'neutral',
  /** Refers to the primary brand tint. */
  Brand: 'brand',
  /** Refers to the positive / confirmation tint. */
  Success: 'success',
  /** Refers to the caution tint. */
  Warning: 'warning',
  /** Refers to the destructive / error tint. */
  Danger: 'danger',
  /** Refers to the informational tint. */
  Info: 'info',
} as const;

export type TagVariant = (typeof TagVariant)[keyof typeof TagVariant];

export const tagVariants = tv({
  base: 'inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-card-foreground',
  variants: {
    variant: {
      neutral: '',
      brand: 'border-transparent bg-primary-soft text-primary-soft-foreground',
      success: 'border-transparent bg-success-soft text-success-soft-foreground',
      warning: 'border-transparent bg-warning-soft text-warning-soft-foreground',
      danger: 'border-transparent bg-destructive-soft text-destructive-soft-foreground',
      info: 'border-transparent bg-info-soft text-info-soft-foreground',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export type TagVariants = VariantProps<typeof tagVariants>;

/* Compile-time lock: enum values ≡ tv variant value-set (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertTagVariant: AssertExact<TagVariant, NonNullable<VariantProps<typeof tagVariants>['variant']>> = true;
void _assertTagVariant;
