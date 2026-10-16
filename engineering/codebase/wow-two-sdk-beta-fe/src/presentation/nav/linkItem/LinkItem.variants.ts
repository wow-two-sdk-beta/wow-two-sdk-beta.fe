import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the LinkItem's color treatment. */
export const LinkItemVariant = {
  /** Refers to the primary-colored link. */
  Default: 'default',
  /** Refers to a foreground-colored, underline-on-hover link. */
  Subtle: 'subtle',
  /** Refers to a muted link that brightens on hover. */
  Muted: 'muted',
  /** Refers to a link that inherits the surrounding text color. */
  Inherit: 'inherit',
} as const;

export type LinkItemVariant = (typeof LinkItemVariant)[keyof typeof LinkItemVariant];

/** Defines the LinkItem's text size. */
export const LinkItemSize = {
  /** Refers to the small text size. */
  Sm: 'sm',
  /** Refers to the base (default) text size. */
  Md: 'md',
  /** Refers to the large text size. */
  Lg: 'lg',
} as const;

export type LinkItemSize = (typeof LinkItemSize)[keyof typeof LinkItemSize];

export const linkVariants = tv({
  base: 'inline-flex items-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
  variants: {
    variant: {
      /* `-soft-foreground`, not `text-primary`: a link has no fill of its own, so it lands on
         whatever surface hosts it — the pairing `--color-primary-soft-foreground` is toned for.
         `text-primary` measured 4.19:1 on `theme-smart-qr`'s own page background, under AA for
         body text. Same fix as `Button.variants.ts` and `foundation/styles/constants/Tones.ts`. */
      default: 'text-primary-soft-foreground hover:text-primary-soft-foreground/85 hover:underline',
      subtle: 'text-foreground hover:underline',
      muted: 'text-muted-foreground hover:text-foreground hover:underline',
      inherit: 'text-current underline-offset-2 hover:underline',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export type LinkItemVariants = VariantProps<typeof linkVariants>;

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertLinkVariant: AssertExact<LinkItemVariant, NonNullable<LinkItemVariants['variant']>> = true;
const _assertLinkSize: AssertExact<LinkItemSize, NonNullable<LinkItemVariants['size']>> = true;
void _assertLinkVariant;
void _assertLinkSize;
