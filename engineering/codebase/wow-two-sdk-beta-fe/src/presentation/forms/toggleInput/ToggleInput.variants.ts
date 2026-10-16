import { tv, ColorTone, type VariantProps } from '../../../foundation/styles';

/** Defines the ToggleInput's press-state surface style. */
export const ToggleInputVariant = {
  /** Refers to a borderless, transparent surface (text-color only). */
  Ghost: 'ghost',
  /** Refers to a muted/tinted fill on press. */
  Soft: 'soft',
  /** Refers to a bordered surface that swaps to a tone border on press. */
  Outline: 'outline',
  /** Refers to a bordered surface that fills with the tone on press. */
  Solid: 'solid',
  /** Refers to a translucent glass wash + blur. */
  Glass: 'glass',
  /** Refers to a glass surface with a hairline border. */
  GlassSurface: 'glass-surface',
} as const;

export type ToggleInputVariant = (typeof ToggleInputVariant)[keyof typeof ToggleInputVariant];

/** Defines the element ToggleInput renders as. Local because shared `ElementTag` omits `button`. */
export const ToggleInputElement = {
  /** Refers to a native `<button>`. */
  Button: 'button',
  /** Refers to a `<div>` with `role="button"` — interactive children nest without button-in-button. */
  Div: 'div',
} as const;

export type ToggleInputElement = (typeof ToggleInputElement)[keyof typeof ToggleInputElement];

/* Variant × tone matrix for the press-state appearance, over Button's ghost / neutral baseline. */
export const toggleButtonVariants = tv({
  base: '',
  variants: {
    variant: {
      ghost: '',
      soft: '',
      outline: 'border',
      solid: 'border',
      glass: 'border border-transparent backdrop-blur-md',
      'glass-surface': 'border backdrop-blur-md',
    },
    tone: {
      primary: '',
      neutral: '',
      danger: '',
      success: '',
      warning: '',
    },
  },
  compoundVariants: [
    /*
     * Pressed text is `-soft-foreground`, not `{tone}`, for `ghost` and `outline`: both keep a
     * transparent fill, so the pressed label lands on the host surface where the full-strength
     * accent is too light — `ghost/warning` measured 1.85:1 pressed. The `soft` rows below
     * already resolved it this way; these two were missed. Same fix as `Button.variants.ts`
     * and `foundation/styles/constants/Tones.ts`. Borders keep full-strength `{tone}`.
     */
    // === GHOST × tone — text color only, transparent bg ===
    { variant: 'ghost', tone: 'primary', class: 'text-foreground/50 data-[pressed=true]:text-primary-soft-foreground' },
    { variant: 'ghost', tone: 'neutral', class: 'text-foreground/50 data-[pressed=true]:text-foreground' },
    {
      variant: 'ghost',
      tone: 'danger',
      class: 'text-foreground/50 data-[pressed=true]:text-destructive-soft-foreground',
    },
    { variant: 'ghost', tone: 'success', class: 'text-foreground/50 data-[pressed=true]:text-success-soft-foreground' },
    { variant: 'ghost', tone: 'warning', class: 'text-foreground/50 data-[pressed=true]:text-warning-soft-foreground' },

    // === SOFT × tone — pressed gets tone-soft bg ===
    {
      variant: 'soft',
      tone: 'primary',
      class: 'text-foreground/70 data-[pressed=true]:bg-primary-soft data-[pressed=true]:text-primary-soft-foreground',
    },
    {
      variant: 'soft',
      tone: 'neutral',
      class: 'text-foreground/70 data-[pressed=true]:bg-muted data-[pressed=true]:text-foreground',
    },
    {
      variant: 'soft',
      tone: 'danger',
      class:
        'text-foreground/70 data-[pressed=true]:bg-destructive-soft data-[pressed=true]:text-destructive-soft-foreground',
    },
    {
      variant: 'soft',
      tone: 'success',
      class: 'text-foreground/70 data-[pressed=true]:bg-success-soft data-[pressed=true]:text-success-soft-foreground',
    },
    {
      variant: 'soft',
      tone: 'warning',
      class: 'text-foreground/70 data-[pressed=true]:bg-warning-soft data-[pressed=true]:text-warning-soft-foreground',
    },

    // === OUTLINE × tone — pressed swaps to tone border + tone text ===
    {
      variant: 'outline',
      tone: 'primary',
      class:
        'border-input text-foreground/70 data-[pressed=true]:border-primary data-[pressed=true]:text-primary-soft-foreground',
    },
    {
      variant: 'outline',
      tone: 'neutral',
      class:
        'border-input text-foreground/70 data-[pressed=true]:border-foreground data-[pressed=true]:text-foreground',
    },
    {
      variant: 'outline',
      tone: 'danger',
      class:
        'border-input text-foreground/70 data-[pressed=true]:border-destructive data-[pressed=true]:text-destructive-soft-foreground',
    },
    {
      variant: 'outline',
      tone: 'success',
      class:
        'border-input text-foreground/70 data-[pressed=true]:border-success data-[pressed=true]:text-success-soft-foreground',
    },
    {
      variant: 'outline',
      tone: 'warning',
      class:
        'border-input text-foreground/70 data-[pressed=true]:border-warning data-[pressed=true]:text-warning-soft-foreground',
    },

    // === SOLID × tone — pressed fills with tone ===
    {
      variant: 'solid',
      tone: 'primary',
      class:
        'border-input bg-background text-foreground/70 data-[pressed=true]:bg-primary data-[pressed=true]:border-primary data-[pressed=true]:text-primary-foreground',
    },
    {
      variant: 'solid',
      tone: 'neutral',
      class:
        'border-input bg-background text-foreground/70 data-[pressed=true]:bg-foreground data-[pressed=true]:border-foreground data-[pressed=true]:text-background',
    },
    {
      variant: 'solid',
      tone: 'danger',
      class:
        'border-input bg-background text-foreground/70 data-[pressed=true]:bg-destructive data-[pressed=true]:border-destructive data-[pressed=true]:text-destructive-foreground',
    },
    {
      variant: 'solid',
      tone: 'success',
      class:
        'border-input bg-background text-foreground/70 data-[pressed=true]:bg-success data-[pressed=true]:border-success data-[pressed=true]:text-success-foreground',
    },
    {
      variant: 'solid',
      tone: 'warning',
      class:
        'border-input bg-background text-foreground/70 data-[pressed=true]:bg-warning data-[pressed=true]:border-warning data-[pressed=true]:text-warning-foreground',
    },

    // === GLASS × tone — dark glass; pressed darkens slightly + tone-tinted text on tone variants ===
    {
      variant: 'glass',
      tone: 'primary',
      class: 'bg-black/45 text-white/60 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-white',
    },
    {
      variant: 'glass',
      tone: 'neutral',
      class: 'bg-black/45 text-white/60 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-white',
    },
    {
      variant: 'glass',
      tone: 'danger',
      class: 'bg-black/45 text-white/60 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-destructive',
    },
    {
      variant: 'glass',
      tone: 'success',
      class: 'bg-black/45 text-white/60 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-success',
    },
    {
      variant: 'glass',
      tone: 'warning',
      class: 'bg-black/45 text-white/60 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-warning',
    },

    // === GLASS-SURFACE × tone — same as glass + visible border emphasis on press ===
    {
      variant: 'glass-surface',
      tone: 'primary',
      class:
        'bg-black/45 text-white/60 border-white/10 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-white data-[pressed=true]:border-white/40',
    },
    {
      variant: 'glass-surface',
      tone: 'neutral',
      class:
        'bg-black/45 text-white/60 border-white/10 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-white data-[pressed=true]:border-white/40',
    },
    {
      variant: 'glass-surface',
      tone: 'danger',
      class:
        'bg-black/45 text-white/60 border-white/10 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-destructive data-[pressed=true]:border-destructive/60',
    },
    {
      variant: 'glass-surface',
      tone: 'success',
      class:
        'bg-black/45 text-white/60 border-white/10 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-success data-[pressed=true]:border-success/60',
    },
    {
      variant: 'glass-surface',
      tone: 'warning',
      class:
        'bg-black/45 text-white/60 border-white/10 data-[pressed=true]:bg-black/65 data-[pressed=true]:text-warning data-[pressed=true]:border-warning/60',
    },
  ],
  defaultVariants: {
    variant: 'ghost',
    tone: 'primary',
  },
});

export type ToggleInputVariants = VariantProps<typeof toggleButtonVariants>;

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertToggleButtonVariant: AssertExact<ToggleInputVariant, NonNullable<ToggleInputVariants['variant']>> = true;
const _assertToggleButtonTone: AssertExact<ColorTone, NonNullable<ToggleInputVariants['tone']>> = true;
void _assertToggleButtonVariant;
void _assertToggleButtonTone;
