import { tv, Size, type VariantProps } from '../../../foundation/styles';

/** Defines the Badge color treatment. */
export const BadgeVariant = {
  /** Refers to the neutral grey fill. */
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
  /** Refers to a bordered, transparent fill. */
  Outline: 'outline',
} as const;

export type BadgeVariant = (typeof BadgeVariant)[keyof typeof BadgeVariant];

export const badgeVariants = tv({
  base: 'inline-flex items-center rounded-full font-medium',
  variants: {
    variant: {
      neutral: 'bg-muted text-foreground',
      brand: 'bg-primary-soft text-primary-soft-foreground',
      success: 'bg-success-soft text-success-soft-foreground',
      warning: 'bg-warning-soft text-warning-soft-foreground',
      danger: 'bg-destructive-soft text-destructive-soft-foreground',
      info: 'bg-info-soft text-info-soft-foreground',
      outline: 'border border-border text-foreground',
    },
    size: {
      sm: 'h-5 px-2 text-xs',
      md: 'h-6 px-2.5 text-xs',
      lg: 'h-7 px-3 text-sm',
    },
  },
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

export type BadgeVariants = VariantProps<typeof badgeVariants>;

/* Compile-time lock: enum values ≡ tv variant value-set (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertBadgeVariant: AssertExact<BadgeVariant, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = true;
/* `size` prop adopts the shared 5-member `Size`; the tv axis only styles sm/md/lg (widening is intentional). */
const _assertBadgeSize: [NonNullable<VariantProps<typeof badgeVariants>['size']>] extends [Size] ? true : never = true;
void _assertBadgeVariant;
void _assertBadgeSize;
