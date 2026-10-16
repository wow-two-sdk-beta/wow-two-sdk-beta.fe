import { tv, type VariantProps } from '../../../foundation/styles';

export const menuVariants = tv({
  /* Layout only: fill, border, radius, padding and shadow come from the surface recipe, so the `variant`, `tone`,
     `radius`, `padding` and `elevation` props reach the panel. */
  base: 'flex min-w-[8rem] flex-col gap-0.5 text-sm outline-hidden',
});

export const menuItemVariants = tv({
  base: 'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden transition-colors focus:bg-muted focus:text-foreground hover:bg-muted hover:text-foreground',
  variants: {
    state: {
      default: 'text-popover-foreground',
      destructive: 'text-destructive-soft-foreground focus:bg-destructive-soft hover:bg-destructive-soft',
      disabled: 'pointer-events-none opacity-50',
    },
  },
  defaultVariants: { state: 'default' },
});

export const menuLabelVariants = tv({
  base: 'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
});

export const menuSeparatorVariants = tv({
  base: '-mx-1 my-1 h-px bg-border',
});

/** The fixed leading column a checkbox or radio row draws its check mark in. */
export const menuItemIndicatorVariants = tv({
  base: 'inline-flex size-4 shrink-0 items-center justify-center',
});

/** The trailing chevron a submenu trigger row points at its submenu with; it mirrors in right-to-left. */
export const menuSubIndicatorVariants = tv({
  base: 'ms-auto size-4 shrink-0 text-muted-foreground rtl:-scale-x-100',
});

export type MenuVariants = VariantProps<typeof menuVariants>;
export type MenuItemVariants = VariantProps<typeof menuItemVariants>;

/** Defines the visual state of a menu item. */
export const MenuItemState = {
  /** Refers to the default, neutral item. */
  Default: 'default',
  /** Refers to a destructive item (e.g. delete). */
  Destructive: 'destructive',
  /** Refers to a non-interactive, dimmed item. */
  Disabled: 'disabled',
} as const;

export type MenuItemState = (typeof MenuItemState)[keyof typeof MenuItemState];

/* Compile-time lock: enum values ≡ tv `state` keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertMenuItemState: AssertExact<
  MenuItemState,
  NonNullable<VariantProps<typeof menuItemVariants>['state']>
> = true;
void _assertMenuItemState;
