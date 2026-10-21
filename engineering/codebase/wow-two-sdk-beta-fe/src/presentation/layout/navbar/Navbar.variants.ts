import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the band-height of a `Navbar`. */
export const NavbarHeight = {
  /** Refers to a compact bar. */
  Sm: 'sm',
  /** Refers to the default bar height. */
  Md: 'md',
  /** Refers to a tall bar. */
  Lg: 'lg',
} as const;

export type NavbarHeight = (typeof NavbarHeight)[keyof typeof NavbarHeight];

/** Defines which way a `Navbar` runs. */
export const NavbarOrientation = {
  /** Refers to a full-width top bar. */
  Horizontal: 'horizontal',
  /** Refers to a full-height side rail. */
  Vertical: 'vertical',
} as const;

export type NavbarOrientation = (typeof NavbarOrientation)[keyof typeof NavbarOrientation];

/** Defines the element a `Navbar` renders as. */
export const NavbarElement = {
  /** Refers to a `<header>` — a banner landmark at page level. */
  Header: 'header',
  /** Refers to a `<div>` — no landmark, for a bar inside a host that already is the banner. */
  Div: 'div',
} as const;

export type NavbarElement = (typeof NavbarElement)[keyof typeof NavbarElement];

/** Defines the surface a `Navbar` paints. A `tone` overrides it with the tinted subtle surface. */
export const NavbarVariant = {
  /** Refers to the opaque card surface — the default. */
  Solid: 'solid',
  /**
   * Refers to a translucent, blurred surface at the theme's glass strength; opaque where blur or transparency is
   * unavailable or unwanted. A bar paints the chrome material, a sidebar the side one.
   */
  Glass: 'glass',
  /** Refers to no surface; the page shows through. */
  Transparent: 'transparent',
} as const;

export type NavbarVariant = (typeof NavbarVariant)[keyof typeof NavbarVariant];

/**
 * The surface classes per `NavbarVariant` for a bar. `glass` is the `surface-glass` material from `styles.css`
 * (`--glass-fill`, unset the card at 75%) with the theme's `--glass-edge` hairline and `--glass-shadow`, which are
 * the border colour and no shadow when the theme sets none.
 */
export const NavbarSurfaceClass: Record<NavbarVariant, string> = {
  solid: 'bg-card',
  glass: 'surface-glass border-glass-edge shadow-(--glass-shadow)',
  transparent: 'bg-transparent',
};

/** The surface classes per `NavbarVariant` for a sidebar: `glass` is the `surface-glass-side` material. */
export const SidebarSurfaceClass: Record<NavbarVariant, string> = {
  solid: 'bg-card',
  glass: 'surface-glass-side border-glass-edge',
  transparent: 'bg-transparent',
};

/** Provides the header-band chrome (height, sticky positioning) for `Navbar`. */
export const navbarVariants = tv({
  base: 'w-full',
  variants: {
    /* A top bar spans the width at its band height; a rail spans the height as a column. */
    orientation: {
      horizontal: '',
      vertical: 'flex h-full flex-col',
    },
    /* Sticks the band to the top of the scroll container when true. */
    sticky: {
      true: 'sticky top-0 z-sticky',
      false: '',
    },
    /* Band height — the bar's vertical size. */
    height: {
      sm: 'h-12',
      md: 'h-14',
      lg: 'h-16',
    },
  },
  compoundVariants: [
    /* A rail is as tall as its container; the band heights apply to top bars only. */
    { orientation: 'vertical', height: ['sm', 'md', 'lg'], class: 'h-full' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    sticky: false,
    height: 'md',
  },
});

export type NavbarVariants = VariantProps<typeof navbarVariants>;

/* Compile-time lock: enum values ≡ tv `height` keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertNavbarHeight: AssertExact<NavbarHeight, NonNullable<VariantProps<typeof navbarVariants>['height']>> = true;
const _assertNavbarOrientation: AssertExact<
  NavbarOrientation,
  NonNullable<VariantProps<typeof navbarVariants>['orientation']>
> = true;
void _assertNavbarHeight;
void _assertNavbarOrientation;
