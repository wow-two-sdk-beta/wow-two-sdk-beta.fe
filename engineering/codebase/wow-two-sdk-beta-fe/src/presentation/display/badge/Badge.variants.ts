import { tv, Size, type VariantProps } from '../../../foundation/styles';

/** Defines the Badge color treatment. */
export const BadgeVariant = {
  /** Refers to the neutral grey fill. */
  Neutral: 'neutral',
  /** Refers to the primary brand tint. */
  Brand: 'brand',
  /** Refers to the positive / confirmation tint. */
  Success: 'success',
  /** Refers to the caution tint. */
  Warning: 'warning',
  /** Refers to the destructive / error tint. */
  Danger: 'danger',
  /** Refers to the informational tint. */
  Info: 'info',
  /** Refers to a bordered, transparent fill. */
  Outline: 'outline',
  /** Refers to the card fill with the body text — a calm status that lets its icon carry the colour. */
  Surface: 'surface',
  /** Refers to a transparent fill with muted text — a state that asks for no attention. */
  Quiet: 'quiet',
} as const;

export type BadgeVariant = (typeof BadgeVariant)[keyof typeof BadgeVariant];

/** Defines the Badge outline's line style; it shows wherever the pill draws a border. */
export const BadgeBorderStyle = {
  /** Refers to a solid outline. */
  Solid: 'solid',
  /** Refers to a dashed outline — a state that has not happened, such as nothing applied. */
  Dashed: 'dashed',
  /** Refers to a dotted outline — a state nobody can tell, such as unknown. */
  Dotted: 'dotted',
} as const;

export type BadgeBorderStyle = (typeof BadgeBorderStyle)[keyof typeof BadgeBorderStyle];

export const badgeVariants = tv({
  base: 'inline-flex max-w-full items-center rounded-full font-medium',
  variants: {
    variant: {
      neutral: 'bg-muted text-foreground',
      brand: 'bg-primary-soft text-primary-soft-foreground',
      success: 'bg-success-soft text-success-soft-foreground',
      warning: 'bg-warning-soft text-warning-soft-foreground',
      danger: 'bg-destructive-soft text-destructive-soft-foreground',
      info: 'bg-info-soft text-info-soft-foreground',
      outline: 'border border-border text-foreground',
      surface: 'bg-card text-foreground',
      quiet: 'bg-transparent text-muted-foreground',
    },
    size: {
      sm: 'h-5 gap-1 px-2 text-xs',
      md: 'h-6 gap-1.5 px-2.5 text-xs',
      lg: 'h-7 gap-1.5 px-3 text-sm',
    },
    isOutlined: {
      true: 'border',
      false: '',
    },
    borderStyle: {
      solid: '',
      dashed: 'border-dashed',
      dotted: 'border-dotted',
    },
    hasLeading: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    /* The outline takes the tint's own colour, a step stronger than its fill; neutral fills keep the plain border. */
    { isOutlined: true, variant: ['neutral', 'surface', 'quiet', 'outline'], class: 'border-border' },
    { isOutlined: true, variant: 'brand', class: 'border-primary/40' },
    { isOutlined: true, variant: 'success', class: 'border-success/40' },
    { isOutlined: true, variant: 'warning', class: 'border-warning/45' },
    { isOutlined: true, variant: 'danger', class: 'border-destructive/45' },
    { isOutlined: true, variant: 'info', class: 'border-info/40' },
    /* A leading icon sits closer to the rounded start than text does. */
    { hasLeading: true, size: 'sm', class: 'ps-1' },
    { hasLeading: true, size: 'md', class: 'ps-1.5' },
    { hasLeading: true, size: 'lg', class: 'ps-2' },
  ],
  defaultVariants: {
    variant: 'neutral',
    size: 'md',
    isOutlined: false,
    borderStyle: 'solid',
    hasLeading: false,
  },
});

/** The leading icon's box per size step; an icon the caller sizes itself keeps its own size. */
export const badgeLeadingSize = {
  sm: '[&>svg]:size-3',
  md: '[&>svg]:size-3.5',
  lg: '[&>svg]:size-4',
} as const;

/** Whether a variant tints its text, so the detail keeps the tint instead of turning muted. */
export function isTintedBadge(variant: BadgeVariant): boolean {
  return variant !== 'neutral' && variant !== 'outline' && variant !== 'surface' && variant !== 'quiet';
}

export type BadgeVariants = VariantProps<typeof badgeVariants>;

/* Compile-time lock: enum values ≡ tv variant value-set (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertBadgeVariant: AssertExact<BadgeVariant, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = true;
const _assertBadgeBorderStyle: AssertExact<
  BadgeBorderStyle,
  NonNullable<VariantProps<typeof badgeVariants>['borderStyle']>
> = true;
/* `size` prop adopts the shared 5-member `Size`; the tv axis only styles sm/md/lg (widening is intentional). */
const _assertBadgeSize: [NonNullable<VariantProps<typeof badgeVariants>['size']>] extends [Size] ? true : never = true;
void _assertBadgeVariant;
void _assertBadgeBorderStyle;
void _assertBadgeSize;
