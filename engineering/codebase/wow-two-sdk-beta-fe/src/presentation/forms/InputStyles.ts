// Shared visual primitives for form atoms. Co-located in `forms/` so imports
// stay within-domain (ESLint boundaries allow same-domain imports).

import { tv, type VariantProps } from '../../foundation/styles';

/*
 * A read-only control takes the disabled look without the disabled semantics: the muted surface and text, a default
 * cursor, no hover border and a 1px neutral focus ring in place of the brand ring — it stays focusable and its
 * value stays selectable. The `readonly:` variant (index.css) reads the native `readonly` attribute, or
 * `aria-readonly` / `data-readonly` on a trigger or a composite's frame. A disabled control keeps the muted
 * surface it had under `:read-only`, which also matched every `<button>` trigger; triggers now rest on the field.
 */
export const inputBaseVariants = tv({
  base: 'flex w-full rounded-md bg-field text-foreground placeholder:text-subtle-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 readonly:cursor-default readonly:bg-muted readonly:text-muted-foreground readonly:focus-visible:ring-1',
  variants: {
    size: {
      xs: 'h-7 px-2 text-xs',
      sm: 'h-8 px-2.5 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    },
    state: {
      default:
        'border-input hover:border-border-strong readonly:hover:border-input readonly:focus-visible:ring-muted-foreground',
      invalid: 'border-destructive-soft-foreground focus-visible:ring-destructive-soft-foreground',
    },
    /* Border weight — scale like `size`/`radius`; default `sm` (1px). */
    border: {
      none: 'border-0',
      xs: 'border-[0.5px]',
      sm: 'border',
      md: 'border-2',
      lg: 'border-4',
      xl: 'border-8',
    },
    /* Focus-ring weight — default `md` (2px); `sm` for a hairline focus. */
    ring: {
      none: 'focus-visible:ring-0',
      sm: 'focus-visible:ring-1',
      md: 'focus-visible:ring-2',
      lg: 'focus-visible:ring-4',
    },
  },
  /* A caller that turned the focus ring off keeps it off while the control is read-only. */
  compoundVariants: [{ ring: 'none', class: 'readonly:focus-visible:ring-0' }],
  defaultVariants: {
    size: 'md',
    state: 'default',
    border: 'sm',
    ring: 'md',
  },
});

export type InputBaseVariants = VariantProps<typeof inputBaseVariants>;

/**
 * The read-only look for a control that does not extend `inputBaseVariants` (a custom trigger, a drop zone): the muted
 * surface and text, a default cursor, no hover fill and the 1px neutral focus ring. It reads the same `readonly:`
 * variant, so the control carries `data-readonly` while read-only. The control adds `readonly:hover:border-*` for its
 * own resting border, which the hover would otherwise replace.
 */
export const ReadOnlyLook =
  'readonly:cursor-default readonly:bg-muted readonly:text-muted-foreground readonly:hover:bg-muted readonly:focus-visible:ring-1 readonly:focus-visible:ring-muted-foreground';

/** Defines the size step of a form input control. */
export const InputSize = {
  /** Refers to the extra-small step (h-7). */
  Xs: 'xs',
  /** Refers to the small step (h-8). */
  Sm: 'sm',
  /** Refers to the medium (default) step (h-10). */
  Md: 'md',
  /** Refers to the large step (h-12). */
  Lg: 'lg',
} as const;

export type InputSize = (typeof InputSize)[keyof typeof InputSize];

/** Defines the validity surface of a form input control. */
export const InputState = {
  /** Refers to the default (valid / untouched) surface. */
  Default: 'default',
  /** Refers to the invalid surface (destructive border + ring). */
  Invalid: 'invalid',
} as const;

export type InputState = (typeof InputState)[keyof typeof InputState];

/** Defines the border-weight step of a form input control. */
export const InputBorder = {
  /** Refers to no border. */
  None: 'none',
  /** Refers to a 0.5px hairline border. */
  Xs: 'xs',
  /** Refers to a 1px border (default). */
  Sm: 'sm',
  /** Refers to a 2px border. */
  Md: 'md',
  /** Refers to a 4px border. */
  Lg: 'lg',
  /** Refers to an 8px border. */
  Xl: 'xl',
} as const;

export type InputBorder = (typeof InputBorder)[keyof typeof InputBorder];

/** Defines the focus-ring-weight step of a form input control. */
export const InputRing = {
  /** Refers to no focus ring. */
  None: 'none',
  /** Refers to a 1px focus ring. */
  Sm: 'sm',
  /** Refers to a 2px focus ring (default). */
  Md: 'md',
  /** Refers to a 4px focus ring. */
  Lg: 'lg',
} as const;

export type InputRing = (typeof InputRing)[keyof typeof InputRing];

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertInputSize: AssertExact<InputSize, NonNullable<VariantProps<typeof inputBaseVariants>['size']>> = true;
const _assertInputState: AssertExact<InputState, NonNullable<VariantProps<typeof inputBaseVariants>['state']>> = true;
const _assertInputBorder: AssertExact<
  InputBorder,
  NonNullable<VariantProps<typeof inputBaseVariants>['border']>
> = true;
const _assertInputRing: AssertExact<InputRing, NonNullable<VariantProps<typeof inputBaseVariants>['ring']>> = true;
void _assertInputSize;
void _assertInputState;
void _assertInputBorder;
void _assertInputRing;
