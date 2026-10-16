import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the ListGroup item marker style. */
export const ListGroupMarker = {
  /** Refers to no marker (flush list). */
  None: 'none',
  /** Refers to a filled-disc bullet. */
  Disc: 'disc',
  /** Refers to a decimal-numbered marker. */
  Decimal: 'decimal',
  /** Refers to a check-mark marker. */
  Check: 'check',
} as const;

export type ListGroupMarker = (typeof ListGroupMarker)[keyof typeof ListGroupMarker];

/** Defines the vertical spacing between ListGroup items. */
export const ListGroupSpacing = {
  /** Refers to tight spacing. */
  Tight: 'tight',
  /** Refers to normal (default) spacing. */
  Normal: 'normal',
  /** Refers to loose spacing. */
  Loose: 'loose',
} as const;

export type ListGroupSpacing = (typeof ListGroupSpacing)[keyof typeof ListGroupSpacing];

export const listVariants = tv({
  base: 'list-outside',
  variants: {
    marker: {
      none: 'list-none pl-0',
      disc: 'list-disc pl-5',
      decimal: 'list-decimal pl-5',
      check: 'list-none pl-0',
    },
    spacing: {
      tight: '[&>li]:py-0.5',
      normal: '[&>li]:py-1',
      loose: '[&>li]:py-2',
    },
  },
  defaultVariants: {
    marker: 'none',
    spacing: 'normal',
  },
});

export const listItemVariants = tv({
  base: 'flex items-start gap-3 text-sm text-foreground',
});

export type ListGroupVariants = VariantProps<typeof listVariants>;

/* Compile-time lock: enum values ≡ tv marker/spacing value-sets (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertListMarker: AssertExact<ListGroupMarker, NonNullable<VariantProps<typeof listVariants>['marker']>> = true;
const _assertListSpacing: AssertExact<
  ListGroupSpacing,
  NonNullable<VariantProps<typeof listVariants>['spacing']>
> = true;
void _assertListMarker;
void _assertListSpacing;
