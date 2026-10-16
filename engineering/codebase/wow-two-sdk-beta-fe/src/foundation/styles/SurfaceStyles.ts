/* Provides the cross-domain surface style engine — variant × tone × radius × padding × elevation. */

import { tv, type VariantProps } from './Tv';
import { Tones } from './constants/Tones';
import { Tone } from './enums/StyleTokens';

/** Defines the visual-recipe axis of a surface (solid · soft · surface · outline · glass · etc.). */
export const SurfaceVariant = {
  /** Refers to an opaque fill, no border, light shadow. */
  Solid: 'solid',
  /** Refers to a muted/tinted fill, no border, light shadow. */
  Soft: 'soft',
  /** Refers to an opaque fill + visible border + medium shadow. */
  Surface: 'surface',
  /** Refers to an opaque popover fill + stronger border + heavy shadow — open menus, listboxes and popovers. */
  Raised: 'raised',
  /** Refers to a transparent fill + visible border. */
  Outline: 'outline',
  /** Refers to a translucent + blur fill, no border, medium shadow. */
  Glass: 'glass',
  /** Refers to a translucent + blur fill + subtle border. */
  GlassOutline: 'glass-outline',
  /** Refers to an opaque fill, no border, heavy shadow. */
  Elevated: 'elevated',
  /** Refers to an opaque fill, no border, no shadow. */
  Flat: 'flat',
  /** Refers to a low-alpha tinted fill + neutral border, no shadow. */
  Subtle: 'subtle',
} as const;

export type SurfaceVariant = (typeof SurfaceVariant)[keyof typeof SurfaceVariant];

/** Provides the tailwind-variants config for every "block with a visual treatment" surface. */
export const surfaceVariants = tv({
  base: 'outline-hidden transition-colors',
  variants: {
    variant: {
      /* Opaque fill, no border, light shadow — tooltips, chips, inline pills. */
      solid: 'shadow-sm',
      /* Muted/tinted fill, no border, light shadow — chat bubbles, inline groups. */
      soft: 'shadow-sm',
      /* Opaque fill + visible border + medium shadow — cards, panels, toasts. */
      surface: 'border shadow-md',
      /* Opaque popover fill + stronger border + large shadow — the default for floating menus and popovers, so an
         open list reads as raised over the form fields it covers. */
      raised: 'border shadow-lg',
      /* Transparent fill + visible border — static cards, embedded info blocks. */
      outline: 'border bg-transparent',
      /* Translucent + blur, no border, medium shadow — image overlays. */
      glass: 'backdrop-blur-md shadow-md',
      /* Translucent + blur + subtle border — premium / hero overlays. */
      'glass-outline': 'border backdrop-blur-md shadow-md',
      /* Opaque fill, no border, heavy shadow — modals, drawers, command palette. */
      elevated: 'shadow-xl',
      /* Opaque fill, no border, no shadow — embedded sub-panels inside another surface. */
      flat: '',
      /* Low-alpha tinted fill + neutral border, no shadow — section bands, tinted panels. */
      subtle: 'border',
    },

    tone: { neutral: '', primary: '', danger: '', success: '', warning: '', info: '' },

    radius: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      full: 'rounded-full',
    },

    padding: {
      none: 'p-0',
      xs: 'p-1',
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
      xl: 'p-6',
      '2xl': 'p-8',
    },

    /* Optional shadow override — beats variant's default shadow via tailwind-merge precedence. */
    elevation: {
      0: 'shadow-none',
      1: 'shadow-sm',
      2: 'shadow-md',
      3: 'shadow-lg',
      4: 'shadow-xl',
      5: 'shadow-2xl',
    },

    /* Optional ambient treatment — layers over the variant's bg-color/shadow. */
    ambient: {
      none: '',
      sheen: 'surface-sheen',
      glow: 'surface-glow',
      bevel: 'surface-bevel',
    },
  },

  compoundVariants: [
    /* solid / elevated / flat share the same palette — opaque tone bg + tone foreground. */
    { variant: ['solid', 'elevated', 'flat'], tone: 'neutral', class: Tones.solid.neutral },
    { variant: ['solid', 'elevated', 'flat'], tone: 'primary', class: Tones.solid.primary },
    { variant: ['solid', 'elevated', 'flat'], tone: 'danger', class: Tones.solid.danger },
    { variant: ['solid', 'elevated', 'flat'], tone: 'success', class: Tones.solid.success },
    { variant: ['solid', 'elevated', 'flat'], tone: 'warning', class: Tones.solid.warning },
    { variant: ['solid', 'elevated', 'flat'], tone: 'info', class: Tones.solid.info },

    /* soft — muted/tinted bg, tone-readable text. */
    { variant: 'soft', tone: 'neutral', class: Tones.soft.neutral },
    { variant: 'soft', tone: 'primary', class: Tones.soft.primary },
    { variant: 'soft', tone: 'danger', class: Tones.soft.danger },
    { variant: 'soft', tone: 'success', class: Tones.soft.success },
    { variant: 'soft', tone: 'warning', class: Tones.soft.warning },
    { variant: 'soft', tone: 'info', class: Tones.soft.info },

    /* surface — popover bg + tone-accent border. */
    { variant: 'surface', tone: 'neutral', class: Tones.surface.neutral },
    { variant: 'surface', tone: 'primary', class: Tones.surface.primary },
    { variant: 'surface', tone: 'danger', class: Tones.surface.danger },
    { variant: 'surface', tone: 'success', class: Tones.surface.success },
    { variant: 'surface', tone: 'warning', class: Tones.surface.warning },
    { variant: 'surface', tone: 'info', class: Tones.surface.info },

    /* raised — popover bg + stronger tone border. */
    { variant: 'raised', tone: 'neutral', class: Tones.raised.neutral },
    { variant: 'raised', tone: 'primary', class: Tones.raised.primary },
    { variant: 'raised', tone: 'danger', class: Tones.raised.danger },
    { variant: 'raised', tone: 'success', class: Tones.raised.success },
    { variant: 'raised', tone: 'warning', class: Tones.raised.warning },
    { variant: 'raised', tone: 'info', class: Tones.raised.info },

    /* outline — transparent fill, tone border + tone text. */
    { variant: 'outline', tone: 'neutral', class: Tones.outline.neutral },
    { variant: 'outline', tone: 'primary', class: Tones.outline.primary },
    { variant: 'outline', tone: 'danger', class: Tones.outline.danger },
    { variant: 'outline', tone: 'success', class: Tones.outline.success },
    { variant: 'outline', tone: 'warning', class: Tones.outline.warning },
    { variant: 'outline', tone: 'info', class: Tones.outline.info },

    /* glass — translucent tinted fill + blur. */
    { variant: 'glass', tone: 'neutral', class: Tones.glass.neutral },
    { variant: 'glass', tone: 'primary', class: Tones.glass.primary },
    { variant: 'glass', tone: 'danger', class: Tones.glass.danger },
    { variant: 'glass', tone: 'success', class: Tones.glass.success },
    { variant: 'glass', tone: 'warning', class: Tones.glass.warning },
    { variant: 'glass', tone: 'info', class: Tones.glass.info },

    /* glass-outline — glass + tone border at 50% alpha. */
    { variant: 'glass-outline', tone: 'neutral', class: Tones.glassOutline.neutral },
    { variant: 'glass-outline', tone: 'primary', class: Tones.glassOutline.primary },
    { variant: 'glass-outline', tone: 'danger', class: Tones.glassOutline.danger },
    { variant: 'glass-outline', tone: 'success', class: Tones.glassOutline.success },
    { variant: 'glass-outline', tone: 'warning', class: Tones.glassOutline.warning },
    { variant: 'glass-outline', tone: 'info', class: Tones.glassOutline.info },

    /* subtle — low-alpha tinted fill + neutral border, no shadow. */
    { variant: 'subtle', tone: 'neutral', class: Tones.subtle.neutral },
    { variant: 'subtle', tone: 'primary', class: Tones.subtle.primary },
    { variant: 'subtle', tone: 'danger', class: Tones.subtle.danger },
    { variant: 'subtle', tone: 'success', class: Tones.subtle.success },
    { variant: 'subtle', tone: 'warning', class: Tones.subtle.warning },
    { variant: 'subtle', tone: 'info', class: Tones.subtle.info },
  ],

  defaultVariants: {
    variant: 'surface',
    tone: 'neutral',
    radius: 'md',
    padding: 'none',
  },
});

/** Represents the union of every surface variant prop. */
export type SurfaceVariants = VariantProps<typeof surfaceVariants>;

/* Compile-time lock: enum values ≡ tv variant/tone value-sets (drift = type error). */
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _assertSurfaceVariant: AssertExact<
  SurfaceVariant,
  NonNullable<VariantProps<typeof surfaceVariants>['variant']>
> = true;
const _assertSurfaceTone: AssertExact<SurfaceTone, NonNullable<VariantProps<typeof surfaceVariants>['tone']>> = true;
void _assertSurfaceVariant;
void _assertSurfaceTone;

/** Represents the semantic colour axis — the shared `Tone` (neutral · primary · danger · success · warning · info). */
export type SurfaceTone = Tone;

/** Represents the corner-roundness axis (none · sm · md · lg · xl · 2xl · full). */
export type SurfaceRadius = NonNullable<SurfaceVariants['radius']>;

/** Represents the interior-padding axis (none · xs · sm · md · lg · xl · 2xl). */
export type SurfacePadding = NonNullable<SurfaceVariants['padding']>;

/** Represents the shadow-depth override (0–5); omitted means the variant decides. */
export type SurfaceElevation = NonNullable<SurfaceVariants['elevation']>;

/** Represents the optional ambient treatment (none · sheen · glow · bevel); omitted = none. */
export type SurfaceAmbient = NonNullable<SurfaceVariants['ambient']>;
