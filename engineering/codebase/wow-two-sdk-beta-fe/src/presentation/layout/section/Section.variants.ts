import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the vertical-padding scale of the `Section` band. */
export const SectionPaddingY = {
  /** Refers to no vertical padding. */
  None: 'none',
  /** Refers to a small vertical rhythm. */
  Sm: 'sm',
  /** Refers to a medium vertical rhythm. */
  Md: 'md',
  /** Refers to a large vertical rhythm. */
  Lg: 'lg',
  /** Refers to an extra-large vertical rhythm. */
  Xl: 'xl',
} as const;

export type SectionPaddingY = (typeof SectionPaddingY)[keyof typeof SectionPaddingY];

/** Provides the vertical-rhythm (top/bottom padding) scale for the `Section` band. */
export const sectionVariants = tv({
  base: 'w-full',
  variants: {
    /* Vertical padding — the band's top/bottom breathing room. */
    py: {
      none: 'py-0',
      sm: 'py-6',
      md: 'py-10',
      lg: 'py-16',
      xl: 'py-24',
    },
  },
  defaultVariants: {
    py: 'md',
  },
});

export type SectionVariants = VariantProps<typeof sectionVariants>;

/* Compile-time lock: enum values ≡ tv `py` keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSectionPaddingY: AssertExact<
  SectionPaddingY,
  NonNullable<VariantProps<typeof sectionVariants>['py']>
> = true;
void _assertSectionPaddingY;
