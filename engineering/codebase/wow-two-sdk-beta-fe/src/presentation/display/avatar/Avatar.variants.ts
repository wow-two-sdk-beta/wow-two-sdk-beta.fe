import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines the Avatar silhouette. */
export const AvatarShape = {
  /** Refers to a circular avatar. */
  Circle: 'circle',
  /** Refers to a rounded-square avatar. */
  Square: 'square',
} as const;

export type AvatarShape = (typeof AvatarShape)[keyof typeof AvatarShape];

/** Defines the Avatar tone palette (`none` cedes color to autoColor). */
export const AvatarTone = {
  /** Refers to no tone — autoColor takes over the cascade. */
  None: 'none',
  /** Refers to the neutral / default palette. */
  Neutral: 'neutral',
  /** Refers to the primary brand palette. */
  Primary: 'primary',
  /** Refers to the destructive / error palette. */
  Danger: 'danger',
  /** Refers to the positive / confirmation palette. */
  Success: 'success',
  /** Refers to the caution palette. */
  Warning: 'warning',
} as const;

export type AvatarTone = (typeof AvatarTone)[keyof typeof AvatarTone];

/** Defines the Avatar background fill style. */
export const AvatarBackground = {
  /** Refers to a flat, solid fill. */
  Solid: 'solid',
  /** Refers to a tone-gradient fill. */
  Gradient: 'gradient',
} as const;

export type AvatarBackground = (typeof AvatarBackground)[keyof typeof AvatarBackground];

/** Defines the Avatar focus/emphasis ring tone. */
export const AvatarRing = {
  /** Refers to no ring. */
  None: 'none',
  /** Refers to a neutral border ring. */
  Neutral: 'neutral',
  /** Refers to a primary-toned ring. */
  Primary: 'primary',
  /** Refers to a destructive-toned ring. */
  Danger: 'danger',
  /** Refers to a success-toned ring. */
  Success: 'success',
  /** Refers to a caution-toned ring. */
  Warning: 'warning',
} as const;

export type AvatarRing = (typeof AvatarRing)[keyof typeof AvatarRing];

export const avatarVariants = tv({
  base: 'inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-medium',
  variants: {
    size: {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
      '2xl': 'h-20 w-20 text-2xl',
    },
    shape: {
      circle: 'rounded-full',
      square: 'rounded-md',
    },
    tone: {
      // 'none' is used when autoColor takes over — prevents theme tokens from competing in the cascade.
      none: '',
      neutral: 'bg-muted text-muted-foreground',
      primary: 'bg-primary-soft text-primary-soft-foreground',
      danger: 'bg-destructive-soft text-destructive-soft-foreground',
      success: 'bg-success-soft text-success-soft-foreground',
      warning: 'bg-warning-soft text-warning-soft-foreground',
    },
    bgStyle: {
      solid: '',
      // Gradient class composed in compoundVariants × tone.
      gradient: '',
    },
    ring: {
      none: '',
      neutral: 'ring-2 ring-offset-2 ring-border ring-offset-background',
      primary: 'ring-2 ring-offset-2 ring-primary ring-offset-background',
      danger: 'ring-2 ring-offset-2 ring-destructive ring-offset-background',
      success: 'ring-2 ring-offset-2 ring-success ring-offset-background',
      warning: 'ring-2 ring-offset-2 ring-warning ring-offset-background',
    },
    isLoading: {
      /* The tile keeps its size and shape; forced colours keep it visible as a `GrayText` outline. */
      true:
        'bg-muted! bg-none! text-transparent [&_*]:invisible motion-safe:animate-pulse ' +
        'forced-colors:[forced-color-adjust:none] forced-colors:bg-[color:Canvas]! forced-colors:outline-1 ' +
        'forced-colors:outline-solid forced-colors:-outline-offset-1 forced-colors:outline-[color:GrayText]',
      false: '',
    },
  },
  compoundVariants: [
    // gradient × tone
    { bgStyle: 'gradient', tone: 'neutral', class: 'bg-gradient-to-br from-muted to-muted/40' },
    {
      bgStyle: 'gradient',
      tone: 'primary',
      class: 'bg-gradient-to-br from-primary-soft to-primary text-primary-foreground',
    },
    {
      bgStyle: 'gradient',
      tone: 'danger',
      class: 'bg-gradient-to-br from-destructive-soft to-destructive text-destructive-foreground',
    },
    {
      bgStyle: 'gradient',
      tone: 'success',
      class: 'bg-gradient-to-br from-success-soft to-success text-success-foreground',
    },
    {
      bgStyle: 'gradient',
      tone: 'warning',
      class: 'bg-gradient-to-br from-warning-soft to-warning text-warning-foreground',
    },
  ],
  defaultVariants: {
    size: 'md',
    shape: 'circle',
    tone: 'neutral',
    bgStyle: 'solid',
    ring: 'none',
    isLoading: false,
  },
});

export type AvatarVariants = VariantProps<typeof avatarVariants>;

/* Compile-time lock: enum values ≡ tv shape/tone/bgStyle/ring value-sets (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertAvatarShape: AssertExact<AvatarShape, NonNullable<VariantProps<typeof avatarVariants>['shape']>> = true;
const _assertAvatarTone: AssertExact<AvatarTone, NonNullable<VariantProps<typeof avatarVariants>['tone']>> = true;
const _assertAvatarBackground: AssertExact<
  AvatarBackground,
  NonNullable<VariantProps<typeof avatarVariants>['bgStyle']>
> = true;
const _assertAvatarRing: AssertExact<AvatarRing, NonNullable<VariantProps<typeof avatarVariants>['ring']>> = true;
void _assertAvatarShape;
void _assertAvatarTone;
void _assertAvatarBackground;
void _assertAvatarRing;
