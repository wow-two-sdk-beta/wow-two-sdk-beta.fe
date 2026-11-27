import { tv, type VariantProps } from '../../../foundation/styles';

/** Defines when a carousel's arrows show. */
export const CarouselControls = {
  /** Refers to arrows that always show. */
  Always: 'always',
  /**
   * Refers to arrows that show while the carousel is hovered or holds focus — and always on a device that cannot
   * hover, where nothing would ever reveal them.
   */
  Hover: 'hover',
} as const;

export type CarouselControls = (typeof CarouselControls)[keyof typeof CarouselControls];

/** Defines the surface a carousel arrow sits on. */
export const CarouselNavVariant = {
  /** Refers to the page-surface chip with a hairline ring — arrows over flat content. */
  Surface: 'surface',
  /** Refers to a frosted dark chip with light text — arrows that must read over any photo, in either theme. */
  Glass: 'glass',
} as const;

export type CarouselNavVariant = (typeof CarouselNavVariant)[keyof typeof CarouselNavVariant];

/**
 * The step-back / step-forward arrow, shared by `CarouselPrev` and `CarouselNext` — each adds only its side.
 *
 * Opacity is computed here rather than through `disabled:` because a hover-revealed arrow and a dimmed one set the
 * same property under different variants, and the cascade cannot rank `:disabled` against a group hover.
 */
export const carouselNavVariants = tv({
  base: 'absolute top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
  variants: {
    variant: {
      surface: 'bg-background/80 text-foreground shadow ring-1 ring-border hover:bg-background active:bg-background',
      /* The image-overlay glass of the harvest console card: a fixed dark wash reads over any photo; without
         transparency the wash turns solid enough to carry the white glyph alone. */
      glass:
        'border border-white/20 bg-black/35 text-white backdrop-blur-md hover:bg-black/55 active:bg-black/65 [@media(prefers-reduced-transparency:reduce)]:bg-black/70 [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none',
    },
    controls: {
      always: '',
      /* `group/carousel` is the root; Tailwind's hover variant applies only where the pointer can hover, so the
         `(hover: none)` arm is what keeps the arrows on a touch screen. */
      hover:
        'opacity-0 group-hover/carousel:opacity-100 group-focus-within/carousel:opacity-100 [@media(hover:none)]:opacity-100',
    },
    isDisabled: {
      true: 'pointer-events-none',
      false: '',
    },
  },
  compoundVariants: [
    { controls: 'always', isDisabled: true, class: 'opacity-40' },
    {
      controls: 'hover',
      isDisabled: true,
      class: 'group-hover/carousel:opacity-40 group-focus-within/carousel:opacity-40 [@media(hover:none)]:opacity-40',
    },
  ],
  defaultVariants: {
    variant: 'surface',
    controls: 'always',
    isDisabled: false,
  },
});

/* Compile-time lock: enum values ≡ tv variant value-set (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertNavVariant: AssertExact<
  CarouselNavVariant,
  NonNullable<VariantProps<typeof carouselNavVariants>['variant']>
> = true;
const _assertControls: AssertExact<
  CarouselControls,
  NonNullable<VariantProps<typeof carouselNavVariants>['controls']>
> = true;
void _assertNavVariant;
void _assertControls;
