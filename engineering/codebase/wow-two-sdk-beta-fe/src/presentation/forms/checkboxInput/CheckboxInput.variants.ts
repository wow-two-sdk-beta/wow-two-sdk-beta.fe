import { tv, type VariantProps, ColorTone } from '../../../foundation/styles';

/** Defines the checkbox visual surface style. */
export const CheckboxInputVariant = {
  /** Refers to an opaque, filled surface. */
  Solid: 'solid',
  /** Refers to a soft tinted surface. */
  Soft: 'soft',
  /** Refers to a bordered, transparent surface. */
  Outline: 'outline',
  /** Refers to a borderless, transparent surface. */
  Ghost: 'ghost',
  /** Refers to a glass surface. */
  Glass: 'glass',
  /** Refers to a glass surface with a hairline border. */
  GlassSurface: 'glass-surface',
} as const;

export type CheckboxInputVariant = (typeof CheckboxInputVariant)[keyof typeof CheckboxInputVariant];

export const checkboxVariants = tv({
  base: 'pointer-events-none grid h-full w-full place-items-center rounded-sm border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-disabled:opacity-50',
  variants: {
    variant: {
      solid: 'border-input bg-background',
      soft: 'border-transparent',
      outline: 'bg-transparent',
      ghost: 'border-transparent bg-transparent',
      glass: 'border-white/40 bg-black/40 backdrop-blur-sm',
      'glass-surface': 'border-white/60 bg-black/40 backdrop-blur-sm',
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
    // === SOLID × tone — bg-background unchecked → tone fill checked ===
    {
      variant: 'solid',
      tone: 'primary',
      class: 'text-primary-foreground peer-checked:border-primary peer-checked:bg-primary',
    },
    {
      variant: 'solid',
      tone: 'neutral',
      class: 'text-background peer-checked:border-foreground peer-checked:bg-foreground',
    },
    {
      variant: 'solid',
      tone: 'danger',
      class: 'text-destructive-foreground peer-checked:border-destructive peer-checked:bg-destructive',
    },
    {
      variant: 'solid',
      tone: 'success',
      class: 'text-success-foreground peer-checked:border-success peer-checked:bg-success',
    },
    {
      variant: 'solid',
      tone: 'warning',
      class: 'text-warning-foreground peer-checked:border-warning peer-checked:bg-warning',
    },

    // === SOFT × tone — soft bg unchecked → strong tone fill checked ===
    {
      variant: 'soft',
      tone: 'primary',
      class:
        'bg-primary-soft text-primary-soft-foreground peer-checked:bg-primary peer-checked:text-primary-foreground',
    },
    {
      variant: 'soft',
      tone: 'neutral',
      class: 'bg-muted text-foreground peer-checked:bg-foreground peer-checked:text-background',
    },
    {
      variant: 'soft',
      tone: 'danger',
      class:
        'bg-destructive-soft text-destructive-soft-foreground peer-checked:bg-destructive peer-checked:text-destructive-foreground',
    },
    {
      variant: 'soft',
      tone: 'success',
      class:
        'bg-success-soft text-success-soft-foreground peer-checked:bg-success peer-checked:text-success-foreground',
    },
    {
      variant: 'soft',
      tone: 'warning',
      class:
        'bg-warning-soft text-warning-soft-foreground peer-checked:bg-warning peer-checked:text-warning-foreground',
    },

    // === OUTLINE × tone — tone border unchecked → tone fill checked ===
    {
      variant: 'outline',
      tone: 'primary',
      class: 'border-primary text-primary peer-checked:bg-primary peer-checked:text-primary-foreground',
    },
    {
      variant: 'outline',
      tone: 'neutral',
      class: 'border-border-strong text-foreground peer-checked:bg-foreground peer-checked:text-background',
    },
    {
      variant: 'outline',
      tone: 'danger',
      class: 'border-destructive text-destructive peer-checked:bg-destructive peer-checked:text-destructive-foreground',
    },
    {
      variant: 'outline',
      tone: 'success',
      class: 'border-success text-success peer-checked:bg-success peer-checked:text-success-foreground',
    },
    {
      variant: 'outline',
      tone: 'warning',
      class: 'border-warning text-warning peer-checked:bg-warning peer-checked:text-warning-foreground',
    },

    // === GHOST × tone — no border/bg unchecked → tone-tinted bg + tone check checked ===
    { variant: 'ghost', tone: 'primary', class: 'text-primary peer-checked:bg-primary/10' },
    { variant: 'ghost', tone: 'neutral', class: 'text-foreground peer-checked:bg-muted' },
    { variant: 'ghost', tone: 'danger', class: 'text-destructive peer-checked:bg-destructive/10' },
    { variant: 'ghost', tone: 'success', class: 'text-success peer-checked:bg-success/10' },
    { variant: 'ghost', tone: 'warning', class: 'text-warning peer-checked:bg-warning/10' },

    // === GLASS × tone — dark glass stays on check; only the white check icon appears
    // (peer-checked:opacity-100 on Check). Tone stays text-white, bg never swaps — photo-overlay look. ===
    { variant: 'glass', tone: 'primary', class: 'text-white' },
    { variant: 'glass', tone: 'neutral', class: 'text-white' },
    { variant: 'glass', tone: 'danger', class: 'text-white' },
    { variant: 'glass', tone: 'success', class: 'text-white' },
    { variant: 'glass', tone: 'warning', class: 'text-white' },

    // === GLASS-SURFACE × tone — same as glass, plus white/80 border emphasis on check. ===
    { variant: 'glass-surface', tone: 'primary', class: 'text-white peer-checked:border-white/80' },
    { variant: 'glass-surface', tone: 'neutral', class: 'text-white peer-checked:border-white/80' },
    { variant: 'glass-surface', tone: 'danger', class: 'text-white peer-checked:border-white/80' },
    { variant: 'glass-surface', tone: 'success', class: 'text-white peer-checked:border-white/80' },
    { variant: 'glass-surface', tone: 'warning', class: 'text-white peer-checked:border-white/80' },
  ],
  defaultVariants: {
    variant: 'solid',
    tone: 'primary',
  },
});

export type CheckboxInputVariants = VariantProps<typeof checkboxVariants>;

/* Compile-time lock: enum values ≡ tv axis keys (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertCheckboxVariant: AssertExact<
  CheckboxInputVariant,
  NonNullable<VariantProps<typeof checkboxVariants>['variant']>
> = true;
const _assertCheckboxTone: AssertExact<ColorTone, NonNullable<VariantProps<typeof checkboxVariants>['tone']>> = true;
void _assertCheckboxVariant;
void _assertCheckboxTone;
