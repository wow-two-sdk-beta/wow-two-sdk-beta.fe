import { tv, type VariantProps, Orientation } from '../../../foundation/styles';

/**
 * Provides the rule geometry for `DividerLayout`. A horizontal divider is a full-width
 * top border; a vertical divider is a full-height left border that stretches to
 * its flex/grid parent. The line color is the semantic `border` token.
 */
export const dividerVariants = tv({
  base: 'border-border',
  variants: {
    orientation: {
      horizontal: 'w-full border-t',
      vertical: 'self-stretch border-l',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export type DividerLayoutVariants = VariantProps<typeof dividerVariants>;

/* Compile-time lock: shared `Orientation` values ≡ tv `orientation` keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertDividerOrientation: AssertExact<
  Orientation,
  NonNullable<VariantProps<typeof dividerVariants>['orientation']>
> = true;
void _assertDividerOrientation;

/** Represents the axis of a `DividerLayout` — the shared {@link Orientation} vocabulary. */
export type DividerLayoutOrientation = Orientation;
