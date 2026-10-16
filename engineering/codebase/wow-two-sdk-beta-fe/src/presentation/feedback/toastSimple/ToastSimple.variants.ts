import { Severity, tv, type VariantProps } from '../../../foundation/styles';

export const toastSimpleVariants = tv({
  base: 'pointer-events-auto rounded-md border bg-popover text-popover-foreground shadow-lg px-4 py-3 text-sm',
  variants: {
    severity: {
      info: 'border-info-soft',
      success: 'border-success-soft',
      warning: 'border-warning-soft',
      danger: 'border-destructive-soft',
      neutral: 'border-border',
    },
  },
  defaultVariants: {
    severity: 'neutral',
  },
});

export type ToastSimpleVariants = VariantProps<typeof toastSimpleVariants>;

/* Compile-time lock: Severity values ≡ tv severity keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSeverity: AssertExact<Severity, NonNullable<VariantProps<typeof toastSimpleVariants>['severity']>> = true;
void _assertSeverity;
