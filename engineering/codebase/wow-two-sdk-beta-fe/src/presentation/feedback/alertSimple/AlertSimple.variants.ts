import { Severity, tv, type VariantProps } from '../../../foundation/styles';

export const alertSimpleVariants = tv({
  base: 'rounded-md border px-4 py-3 text-sm',
  variants: {
    severity: {
      info: 'border-info-soft bg-info-soft text-info-soft-foreground',
      success: 'border-success-soft bg-success-soft text-success-soft-foreground',
      warning: 'border-warning-soft bg-warning-soft text-warning-soft-foreground',
      danger: 'border-destructive-soft bg-destructive-soft text-destructive-soft-foreground',
      neutral: 'border-border bg-muted text-foreground',
    },
  },
  defaultVariants: {
    severity: 'info',
  },
});

export type AlertSimpleVariants = VariantProps<typeof alertSimpleVariants>;

/* Compile-time lock: Severity values ≡ tv severity keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSeverity: AssertExact<Severity, NonNullable<VariantProps<typeof alertSimpleVariants>['severity']>> = true;
void _assertSeverity;
