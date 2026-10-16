import { cn, tv, type VariantProps } from '../../../foundation/styles';

/** Defines the SkeletonState placeholder shape. */
export const SkeletonStateShape = {
  /** Refers to a rounded rectangle block. */
  Rect: 'rect',
  /** Refers to a text line (fixed height, small radius). */
  Text: 'text',
  /** Refers to a circle (avatar / icon placeholder). */
  Circle: 'circle',
} as const;

export type SkeletonStateShape = (typeof SkeletonStateShape)[keyof typeof SkeletonStateShape];

/** Defines how a skeleton moves while it waits. */
export const SkeletonStateAnimation = {
  /** Refers to a slow opacity pulse — the default. */
  Pulse: 'pulse',
  /** Refers to a light band sweeping across the placeholder. */
  Shimmer: 'shimmer',
  /** Refers to a still placeholder, for dense or reduced-noise surfaces. */
  None: 'none',
} as const;

export type SkeletonStateAnimation = (typeof SkeletonStateAnimation)[keyof typeof SkeletonStateAnimation];

/*
 * Motion runs under `motion-safe:` only. The shimmer sweeps a background band rather than a pseudo-element, so it
 * needs neither `relative` nor `overflow-hidden` on the host and works on inline text bars that wrap.
 */
const Animation = {
  pulse: 'motion-safe:animate-pulse',
  shimmer:
    'bg-linear-to-r from-transparent via-background/60 to-transparent bg-no-repeat [background-size:300%_100%] ' +
    'motion-safe:animate-(--animate-skeleton-sweep)',
  none: '',
} as const;

/*
 * The placeholder surface. Forced colours would repaint the fill as `Canvas` and show the hidden text, so the
 * placeholder opts out of forced colours and draws a `GrayText` outline on a `Canvas` fill instead.
 */
const Paint =
  'bg-muted forced-colors:[forced-color-adjust:none] forced-colors:bg-none forced-colors:bg-[color:Canvas] ' +
  'forced-colors:text-transparent forced-colors:outline-1 forced-colors:outline-solid forced-colors:-outline-offset-1 ' +
  'forced-colors:outline-[color:GrayText]';

/** Hides a placeholder's own content while its box keeps the content's size. */
const Mask = 'select-none text-transparent [&_*]:invisible';

/** The classes that paint a placeholder surface — fill, forced-colours outline and the motion-safe animation. */
export function skeletonPaintClass(animation: SkeletonStateAnimation = SkeletonStateAnimation.Pulse): string {
  return cn(Paint, Animation[animation]);
}

/**
 * The classes that turn a component's own box into its placeholder: the box keeps its size, radius and padding,
 * while its border, text and children are masked. Merge them last so they win over the component's colours.
 */
export function skeletonBoxClass(animation: SkeletonStateAnimation = SkeletonStateAnimation.Pulse): string {
  return cn('border-transparent placeholder:text-transparent', Mask, skeletonPaintClass(animation));
}

/** The classes for an inline text bar: one rounded bar per line box, as wide as the text it hides. */
export function skeletonLineClass(animation: SkeletonStateAnimation = SkeletonStateAnimation.Pulse): string {
  return cn('rounded-sm box-decoration-clone', Mask, skeletonPaintClass(animation));
}

export const skeletonVariants = tv({
  base: Paint,
  variants: {
    shape: {
      rect: 'rounded-md',
      text: 'h-4 rounded-sm',
      circle: 'rounded-full',
    },
    animation: Animation,
  },
  defaultVariants: {
    shape: 'rect',
    animation: 'pulse',
  },
});

export type SkeletonStateVariants = VariantProps<typeof skeletonVariants>;

/** A content-shaped slot takes its size from the content it hides, so its shapes set corners only. */
export const skeletonSlotVariants = tv({
  base: `pointer-events-none ${Mask} ${Paint}`,
  variants: {
    shape: {
      rect: 'rounded-md',
      text: 'rounded-sm',
      circle: 'rounded-full',
    },
    animation: Animation,
  },
  defaultVariants: {
    shape: 'text',
    animation: 'pulse',
  },
});

/* Compile-time lock: enum values ≡ tv keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSkeletonShape: AssertExact<
  SkeletonStateShape,
  NonNullable<VariantProps<typeof skeletonVariants>['shape']>
> = true;
const _assertSkeletonAnimation: AssertExact<
  SkeletonStateAnimation,
  NonNullable<VariantProps<typeof skeletonVariants>['animation']>
> = true;
void _assertSkeletonShape;
void _assertSkeletonAnimation;
