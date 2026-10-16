import { Severity, tv, type VariantProps } from '../../../foundation/styles';

export const bannerSimpleVariants = tv({
  base: 'w-full px-6 py-3 text-sm',
  variants: {
    severity: {
      info: 'bg-info text-info-foreground',
      success: 'bg-success text-success-foreground',
      warning: 'bg-warning text-warning-foreground',
      danger: 'bg-destructive text-destructive-foreground',
      neutral: 'bg-inverse text-inverse-foreground',
    },
  },
  defaultVariants: {
    severity: 'info',
  },
});

export type BannerSimpleVariants = VariantProps<typeof bannerSimpleVariants>;

/* Compile-time lock: Severity values ≡ tv severity keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSeverity: AssertExact<Severity, NonNullable<VariantProps<typeof bannerSimpleVariants>['severity']>> = true;
void _assertSeverity;
