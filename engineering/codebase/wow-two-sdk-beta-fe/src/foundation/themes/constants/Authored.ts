/* Authored palettes.
 * Platform: the shared theme of the wow-two platform apps, taken from Wheelhouse's live chalk/forest palette and
 * validated there. Every value is locked; the few foregrounds and the strong border nudged to clear the SDK's
 * contrast pairs are listed beside their Wheelhouse originals.
 * Glass Harbor, Frost, Bento Deck and Harbor Frost: the Wheelhouse design directions. Surfaces, fills and borders are
 * authored verbatim; text and required indicators pass through `ensureForegroundContrast`, because this SDK checks
 * placeholders, input boundaries and translucent tones the React validator did not. The glass directions carry an
 * `ambient` backdrop for `surface-ambient`.
 * Smart QR: brand fills and neutral backgrounds preserve the original app colors; foreground tokens were corrected
 * for the SDK's declared text/placeholder/glass contrast pairs and await visual review in the app.
 * Ocharo: the owner-approved Ink and Raspberry (light) and Neutral graphite (dark) palette under a raspberry-and-blue
 * backdrop, with the approved frame glass; the tones the approval left open are derived to match it.
 * Smart QR and Ocharo stay candidates until a shipping app validates them through the registry. */

import type { Theme, ThemeAmbient, ThemeGlass } from '../Theme';
import { ThemeRadius, ThemeStatus } from '../Theme';
import type { TokenSet } from '../Tokens';
import { ensureForegroundContrast } from '../ForegroundContrast';
import { validateTheme } from '../Validate';

/* ---------------------------------------------------------------------------
 * Platform — forest actions on warm chalk, pine charcoal at night, under a faint forest-and-gold backdrop.
 * Wheelhouse's values verbatim, except where a comment gives its original: those foregrounds and the strong
 * border moved in lightness only, by the least that clears the declared pairs.
 * ------------------------------------------------------------------------- */

const platformLight: TokenSet = {
  background: '#f4f4ef',
  foreground: '#202d27',
  card: '#ffffff',
  'card-foreground': '#202d27',
  popover: '#ffffff',
  'popover-foreground': '#202d27',
  field: '#ffffff',
  muted: '#eaece5',
  'muted-foreground': '#56665d',
  'subtle-foreground': '#5e6d64',
  inverse: '#202d27',
  'inverse-foreground': '#f4f4ef',
  border: '#dde2d8',
  'border-strong': '#80897e', // #b8c2b6: 1.54–1.84:1 on the neutral surfaces
  input: '#758579',
  ring: '#285c4b',
  primary: '#285c4b',
  'primary-foreground': '#ffffff',
  'primary-soft': '#e2eee6',
  'primary-soft-foreground': '#215545', // #285c4b, and each soft foreground below: under 4.5:1 on its 30% tone wash
  accent: '#806235',
  'accent-foreground': '#ffffff',
  'accent-soft': '#f1eade',
  'accent-soft-foreground': '#6a4b15', // #755521
  destructive: '#b44745',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#f9e8e5',
  'destructive-soft-foreground': '#8f2d2b', // #a13d39
  info: '#306a83',
  'info-foreground': '#ffffff',
  'info-soft': '#e4eef4',
  'info-soft-foreground': '#20556d', // #2d6179
  success: '#26704c',
  'success-foreground': '#ffffff',
  'success-soft': '#e3f0e5',
  'success-soft-foreground': '#1b5a35', // #25633d
  warning: '#966014',
  'warning-foreground': '#ffffff',
  'warning-soft': '#faf0d9',
  'warning-soft-foreground': '#704900', // #7d5511
};

const platformDark: TokenSet = {
  background: '#121917',
  foreground: '#edf1eb',
  card: '#1b2420',
  'card-foreground': '#edf1eb',
  popover: '#1b2420',
  'popover-foreground': '#edf1eb',
  field: '#121917',
  muted: '#29352e',
  'muted-foreground': '#b2beb4',
  'subtle-foreground': '#a1aea3',
  inverse: '#edf1eb',
  'inverse-foreground': '#121917',
  border: '#344138',
  'border-strong': '#6c8072', // #536659: 2.08–2.90:1 on the neutral surfaces
  input: '#7b8d7f',
  ring: '#a6d4bd',
  primary: '#a6d4bd',
  'primary-foreground': '#14352a',
  'primary-soft': '#283e33',
  'primary-soft-foreground': '#bde3cc', // #b6dcc5, and each soft foreground below: under 4.5:1 on its wash over muted
  accent: '#d9bd8c',
  'accent-foreground': '#36280e',
  'accent-soft': '#3d3424',
  'accent-soft-foreground': '#edd2a5', // #e4c99c
  destructive: '#efa69c',
  'destructive-foreground': '#3c1715',
  'destructive-soft': '#442c29',
  'destructive-soft-foreground': '#fdc3b8', // #efb5aa
  info: '#9dcce1',
  'info-foreground': '#102731',
  'info-soft': '#293b44',
  'info-soft-foreground': '#bdddee', // #b6d6e7
  success: '#a1d7b3',
  'success-foreground': '#11281a',
  'success-soft': '#243c2b',
  'success-soft-foreground': '#bce4c7', // #b4dcbf
  warning: '#eac582',
  'warning-foreground': '#382709',
  'warning-soft': '#3e3320',
  'warning-soft-foreground': '#f4d6a0', // #edcf99
};

/* Two still glows from the top corners: forest at the left, gold at the right. */
const platformAmbient: ThemeAmbient = {
  light: [
    'radial-gradient(ellipse 70rem 42rem at 0% 0%, #80aa9210, transparent 72%)',
    'radial-gradient(ellipse 58rem 42rem at 100% 10%, #d6b6750f, transparent 74%)',
  ].join(', '),
  dark: [
    'radial-gradient(ellipse 70rem 42rem at 0% 0%, #3d7b6229, transparent 72%)',
    'radial-gradient(ellipse 58rem 42rem at 100% 10%, #aa854d1a, transparent 74%)',
  ].join(', '),
};

/** Platform — the shared look of the wow-two platform apps, proven in Wheelhouse. */
const platform: Theme = {
  id: 'platform',
  name: 'Platform',
  description:
    'Forest actions on warm chalk (light) / pine charcoal (dark) under a faint forest-and-gold backdrop — the shared theme of the wow-two platform apps, proven in Wheelhouse.',
  tags: ['platform', 'validated', 'product', 'forest', 'chalk', 'warm', 'glass', 'aa'],
  light: platformLight,
  dark: platformDark,
  ambient: platformAmbient,
  status: ThemeStatus.Validated,
  meta: validateTheme({ light: platformLight, dark: platformDark }),
};

// Original inherited palette retained as the authored base; explicit foreground corrections follow below.
const SmartQrBaseLight: TokenSet = {
  background: '#ffffff',
  foreground: '#18181b',
  card: '#ffffff',
  'card-foreground': '#18181b',
  popover: '#ffffff',
  'popover-foreground': '#18181b',
  field: '#ffffff',
  muted: '#f4f4f5',
  'muted-foreground': '#71717a',
  'subtle-foreground': '#a1a1aa',
  inverse: '#18181b',
  'inverse-foreground': '#fafafa',
  border: '#e4e4e7',
  'border-strong': '#d4d4d8',
  input: '#d4d4d8',
  ring: '#3b82f6',
  primary: '#2563eb',
  'primary-foreground': '#ffffff',
  'primary-soft': '#dbeafe',
  'primary-soft-foreground': '#1d4ed8',
  accent: '#0d9488',
  'accent-foreground': '#ffffff',
  'accent-soft': '#ccfbf1',
  'accent-soft-foreground': '#115e59',
  destructive: '#dc2626',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#fef2f2',
  'destructive-soft-foreground': '#b91c1c',
  info: '#0891b2',
  'info-foreground': '#ffffff',
  'info-soft': '#ecfeff',
  'info-soft-foreground': '#0e7490',
  success: '#16a34a',
  'success-foreground': '#ffffff',
  'success-soft': '#f0fdf4',
  'success-soft-foreground': '#15803d',
  warning: '#f59e0b',
  'warning-foreground': '#78350f',
  'warning-soft': '#fffbeb',
  'warning-soft-foreground': '#b45309',
};

const SmartQrBaseDark: TokenSet = {
  background: '#09090b',
  foreground: '#fafafa',
  card: '#18181b',
  'card-foreground': '#fafafa',
  popover: '#18181b',
  'popover-foreground': '#fafafa',
  field: '#09090b',
  muted: '#18181b',
  'muted-foreground': '#a1a1aa',
  'subtle-foreground': '#71717a',
  inverse: '#fafafa',
  'inverse-foreground': '#09090b',
  border: '#27272a',
  'border-strong': '#3f3f46',
  input: '#3f3f46',
  ring: '#60a5fa',
  primary: '#3b82f6',
  'primary-foreground': '#ffffff',
  'primary-soft': '#1e3a8a',
  'primary-soft-foreground': '#dbeafe',
  accent: '#2dd4bf',
  'accent-foreground': '#042f2e',
  'accent-soft': '#134e4a',
  'accent-soft-foreground': '#5eead4',
  destructive: '#ef4444',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#7f1d1d',
  'destructive-soft-foreground': '#fee2e2',
  info: '#06b6d4',
  'info-foreground': '#ffffff',
  'info-soft': '#164e63',
  'info-soft-foreground': '#cffafe',
  success: '#22c55e',
  'success-foreground': '#ffffff',
  'success-soft': '#14532d',
  'success-soft-foreground': '#dcfce7',
  warning: '#f59e0b',
  'warning-foreground': '#78350f',
  'warning-soft': '#78350f',
  'warning-soft-foreground': '#fef3c7',
};

// Original authored backgrounds and brand fills; foreground corrections are explicit and reviewable.
const smartQrLight: TokenSet = {
  ...SmartQrBaseLight,
  background: '#d9dde8',
  card: '#ebeef4',
  popover: '#ebeef4',
  'popover-foreground': '#1c1d26',
  field: '#ebeef4',
  muted: '#f1f2f8',
  foreground: '#1c1d26',
  'card-foreground': '#1c1d26', // = foreground (app inherits foreground here)
  'muted-foreground': 'oklch(49.6% 0.0358 279.3)',
  'subtle-foreground': 'oklch(49.5% 0.0323 277.4)',
  border: '#e4e6f0',
  'border-strong': 'oklch(59.1% 0.0210 276.9)',
  input: 'oklch(59.0% 0.0137 277.1)',
  ring: '#8b5cf6',
  primary: '#7c3aed',
  'primary-foreground': '#f5f3ff',
  'primary-soft': '#ede9fe',
  'primary-soft-foreground': 'oklch(42.5% 0.2106 292.8)',
  accent: '#0d9488',
  'accent-foreground': 'oklch(22.9% 0.0000 89.9)',
  'accent-soft': '#ccfbf1',
  'accent-soft-foreground': 'oklch(41.6% 0.0705 188.2)',
  'destructive-soft-foreground': 'oklch(41.4% 0.1694 27.5)',
  'info-foreground': 'oklch(23.5% 0.0000 89.9)',
  'info-soft-foreground': 'oklch(41.9% 0.0783 223.1)',
  'success-foreground': 'oklch(27.3% 0.0000 89.9)',
  'success-soft-foreground': 'oklch(41.8% 0.1152 150.1)',
  'warning-foreground': 'oklch(39.7% 0.1054 45.9)',
  'warning-soft-foreground': 'oklch(46.9% 0.1261 49.0)',
};

const smartQrDark: TokenSet = {
  ...SmartQrBaseDark,
  background: '#121214',
  card: '#1c1c1f',
  popover: '#1c1c1f',
  'popover-foreground': '#e7e7e9',
  field: '#121214',
  muted: '#18181b',
  foreground: '#e7e7e9',
  'card-foreground': '#e7e7e9', // = foreground (app inherits foreground here)
  'muted-foreground': '#a1a1aa',
  'subtle-foreground': 'oklch(61.3% 0.0123 286.0)',
  border: '#2a2a2e',
  'border-strong': 'oklch(51.6% 0.0103 285.9)',
  input: 'oklch(51.6% 0.0072 285.9)',
  ring: '#8b5cf6',
  primary: '#8b5cf6',
  'primary-soft': '#2a2440',
  'primary-soft-foreground': '#c4b5fd',
  accent: '#2dd4bf',
  'accent-soft': '#103a35',
  'accent-soft-foreground': '#5eead4',
  'primary-foreground': 'oklch(16.9% 0.0000 89.9)',
  'destructive-foreground': 'oklch(22.7% 0.0000 89.9)',
  'info-foreground': 'oklch(35.7% 0.0000 89.9)',
  'success-foreground': 'oklch(37.3% 0.0000 89.9)',
  'warning-foreground': 'oklch(39.7% 0.1054 45.9)',
};

/** Smart QR with contrast-corrected foregrounds, awaiting a fresh visual review in the app. */
const smartQr: Theme = {
  id: 'smart-qr',
  name: 'Smart QR',
  description:
    'Violet brand + teal accent on cool lavender-grey (light) / charcoal (dark) — contrast-corrected Smart QR candidate awaiting app review.',
  tags: ['brand', 'violet', 'teal', 'candidate', 'aa', 'product'],
  light: smartQrLight,
  dark: smartQrDark,
  status: ThemeStatus.Candidate,
  meta: validateTheme({ light: smartQrLight, dark: smartQrDark }),
};

/* ---------------------------------------------------------------------------
 * Ocharo — raspberry actions on cool white and ink (light) / neutral graphite (dark), under a raspberry-and-blue
 * backdrop. The owner approved Ink and Raspberry and Neutral graphite on 2026-10-02 and the glass-and-gradient
 * direction on 2026-10-17. Approved values are verbatim, except where a comment gives the original: those moved in
 * lightness only, by the least that clears the declared pairs. The approval left muted, subtle, inverse, field,
 * accent and the status families open; they are derived here (muted and the status tones start from Catalogue's
 * shipped values). The approved header and menu materials (light: white at 84% and 92%; dark: #29292d at 90% and
 * 96%) set the popover colour and, with the sidebar, blur, edge and shadows, the theme's glass strength.
 * ------------------------------------------------------------------------- */

const ocharoLight: TokenSet = {
  background: '#f5f6fa',
  foreground: '#181b25',
  card: '#ffffff',
  'card-foreground': '#181b25',
  popover: '#ffffff',
  'popover-foreground': '#181b25',
  field: '#ffffff',
  muted: '#eef0f6',
  'muted-foreground': '#555e72',
  'subtle-foreground': '#5f687b',
  inverse: '#181b25',
  'inverse-foreground': '#f5f6fa',
  border: '#dfe3ed',
  'border-strong': '#828b9f', // #858ea3: 2.88:1 on muted
  input: '#828b9f', // #858ea3
  ring: '#9d2e6a',
  primary: '#8b2459',
  'primary-foreground': '#ffffff',
  'primary-soft': '#f8e9f0',
  'primary-soft-foreground': '#892257', // #8b2459: 4.39:1 on its 30% tone wash over muted
  accent: '#2457ce',
  'accent-foreground': '#ffffff',
  'accent-soft': '#e8eefc',
  'accent-soft-foreground': '#1545bb',
  destructive: '#a0443d',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#fae9e6',
  'destructive-soft-foreground': '#8d322d',
  info: '#176d8b',
  'info-foreground': '#ffffff',
  'info-soft': '#e3f1f9',
  'info-soft-foreground': '#005974',
  success: '#426553',
  'success-foreground': '#ffffff',
  'success-soft': '#e9f0e9',
  'success-soft-foreground': '#365847',
  warning: '#906623',
  'warning-foreground': '#ffffff',
  'warning-soft': '#f8efdd',
  'warning-soft-foreground': '#744c00',
};

const ocharoDark: TokenSet = {
  background: '#141416',
  foreground: '#f4f2f5',
  card: '#1d1d20',
  'card-foreground': '#f4f2f5',
  popover: '#29292d',
  'popover-foreground': '#f4f2f5',
  field: '#141416',
  muted: '#262629',
  'muted-foreground': '#b7b3bd',
  'subtle-foreground': '#a29ea8',
  inverse: '#f4f2f5',
  'inverse-foreground': '#141416',
  border: '#3d3b42',
  'border-strong': '#85808c',
  input: '#85808c',
  ring: '#e69abc',
  primary: '#c24783',
  'primary-foreground': '#ffffff',
  'primary-soft': '#392330',
  'primary-soft-foreground': '#e69abc',
  accent: '#5b6cc8',
  'accent-foreground': '#ffffff',
  'accent-soft': '#262c44',
  'accent-soft-foreground': '#b5c2f2',
  destructive: '#efaaa1',
  'destructive-foreground': '#3c1715',
  'destructive-soft': '#492b28',
  'destructive-soft-foreground': '#ffd0c8',
  info: '#94c6e1',
  'info-foreground': '#08222f',
  'info-soft': '#20333c',
  'info-soft-foreground': '#b8daed',
  success: '#a6cfb4',
  'success-foreground': '#11281a',
  'success-soft': '#263d30',
  'success-soft-foreground': '#c1e1ca',
  warning: '#e1bd79',
  'warning-foreground': '#382709',
  'warning-soft': '#473b25',
  'warning-soft-foreground': '#f0d299',
};

/* The approved prototype's medium backdrop: a raspberry glow from the top left (16%), a cool blue one from the bottom
 * right (11%) and a faint rose one near the top right (8%), at the same alphas in both modes. */
const ocharoAmbient: ThemeAmbient = {
  light: [
    'radial-gradient(ellipse 60% 55% at 0% 0%, #8b245929, transparent 70%)',
    'radial-gradient(ellipse 55% 60% at 100% 100%, #2457ce1c, transparent 70%)',
    'radial-gradient(ellipse 40% 35% at 70% 8%, #c2478314, transparent 75%)',
  ].join(', '),
  dark: [
    'radial-gradient(ellipse 60% 55% at 0% 0%, #c2478329, transparent 70%)',
    'radial-gradient(ellipse 55% 60% at 100% 100%, #5b6cc81c, transparent 70%)',
    'radial-gradient(ellipse 40% 35% at 70% 8%, #8a6f9e14, transparent 75%)',
  ].join(', '),
};

/* The approved frame glass, verbatim from Ocharo Desk's `oc-glass` materials: the chrome at 84% / 90%, the sidebar at
 * 60% / 70% over #212125, menus at 92% / 96%, a 24px blur, and a white top highlight inside both shadows. */
const ocharoGlass: ThemeGlass = {
  light: {
    fill: 'rgb(255 255 255 / 0.84)',
    sideFill: 'rgb(255 255 255 / 0.6)',
    menuFill: 'rgb(255 255 255 / 0.92)',
    blur: '24px',
    saturate: '120%',
    edge: 'rgb(24 27 37 / 0.08)',
    highlight: 'rgb(255 255 255 / 0.9)',
    shadow: '0 10px 30px rgb(24 27 37 / 0.06)',
    menuShadow: '0 18px 50px rgb(24 27 37 / 0.16)',
  },
  dark: {
    fill: 'rgb(41 41 45 / 0.9)',
    sideFill: 'rgb(33 33 37 / 0.7)',
    menuFill: 'rgb(41 41 45 / 0.96)',
    blur: '24px',
    saturate: '100%',
    edge: 'rgb(255 255 255 / 0.07)',
    highlight: 'rgb(255 255 255 / 0.06)',
    shadow: '0 12px 32px rgb(0 0 0 / 0.25)',
    menuShadow: '0 20px 60px rgb(0 0 0 / 0.5)',
  },
};

/** Ocharo — the shared look of the Ocharo apps; the product keeps its layout and typography. */
const ocharo: Theme = {
  id: 'ocharo',
  name: 'Ocharo',
  description:
    'Raspberry actions and a cobalt accent on cool white and ink (light) / neutral graphite (dark) under a raspberry-and-blue glass backdrop — the owner-approved Ocharo palette, awaiting validation in Desk.',
  tags: ['brand', 'raspberry', 'ink', 'graphite', 'cobalt', 'glass', 'cool', 'neutral', 'candidate', 'aa', 'product'],
  light: ocharoLight,
  dark: ocharoDark,
  radius: ThemeRadius.Lg,
  ambient: ocharoAmbient,
  glass: ocharoGlass,
  status: ThemeStatus.Candidate,
  meta: validateTheme({ light: ocharoLight, dark: ocharoDark }),
};

/** Authored palettes, merged before generated candidates in the registry. */
/* ---------------------------------------------------------------------------
 * Glass Harbor — cyan brand and amber harbor lights on deep navy, under dark glass.
 * Dark is the drawn direction; light is its pale sea-glass daybreak.
 * ------------------------------------------------------------------------- */

const glassHarborLight: TokenSet = ensureForegroundContrast({
  background: '#eaf2f6',
  foreground: '#0b1f33',
  card: '#f7fbfc',
  'card-foreground': '#0b1f33',
  popover: '#ffffff',
  'popover-foreground': '#0b1f33',
  field: '#ffffff',
  muted: '#dde8ee',
  'muted-foreground': '#4a6075',
  'subtle-foreground': '#71879b',
  inverse: '#0b1f33',
  'inverse-foreground': '#eaf2f6',
  border: '#d2dfe7',
  'border-strong': '#b7c9d5',
  input: '#c5d6e0',
  ring: '#1b7f9e',
  primary: '#17718e',
  'primary-foreground': '#ffffff',
  'primary-soft': '#d6ecf3',
  'primary-soft-foreground': '#125a72',
  accent: '#5a48d6',
  'accent-foreground': '#ffffff',
  'accent-soft': '#e6e3fb',
  'accent-soft-foreground': '#3f2fb0',
  destructive: '#c0364c',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#fbe3e7',
  'destructive-soft-foreground': '#9b2438',
  info: '#1f68b0',
  'info-foreground': '#ffffff',
  'info-soft': '#dfeaf7',
  'info-soft-foreground': '#1a538c',
  success: '#1b7a5f',
  'success-foreground': '#ffffff',
  'success-soft': '#dcf2ea',
  'success-soft-foreground': '#155c48',
  warning: '#d9892f',
  'warning-foreground': '#2e1804',
  'warning-soft': '#fcebd9',
  'warning-soft-foreground': '#8a4b0f',
});

const glassHarborDark: TokenSet = ensureForegroundContrast({
  background: '#06121f',
  foreground: '#e8f1f8',
  card: '#0f2133',
  'card-foreground': '#e8f1f8',
  popover: '#13283f',
  'popover-foreground': '#e8f1f8',
  field: '#06121f',
  muted: '#0b1b2c',
  'muted-foreground': '#9fb4c8',
  'subtle-foreground': '#6d86a0',
  inverse: '#e8f1f8',
  'inverse-foreground': '#06121f',
  border: '#20364d',
  'border-strong': '#2f4b68',
  input: '#294460',
  ring: '#5fd3e6',
  primary: '#4fb0cf',
  'primary-foreground': '#041722',
  'primary-soft': '#0e3346',
  'primary-soft-foreground': '#8fe3f2',
  accent: '#a497ff',
  'accent-foreground': '#140e3a',
  'accent-soft': '#231f4d',
  'accent-soft-foreground': '#c9c1ff',
  destructive: '#ff8a9a',
  'destructive-foreground': '#2a0a10',
  'destructive-soft': '#3a1622',
  'destructive-soft-foreground': '#ffb8c2',
  info: '#7cc4fa',
  'info-foreground': '#04182a',
  'info-soft': '#0f2c45',
  'info-soft-foreground': '#a9dcff',
  success: '#5fd3a8',
  'success-foreground': '#03241a',
  'success-soft': '#0f3329',
  'success-soft-foreground': '#8ff0c8',
  warning: '#f4a259',
  'warning-foreground': '#2e1804',
  'warning-soft': '#3a2616',
  'warning-soft-foreground': '#ffc58f',
});

const glassHarborAmbient: ThemeAmbient = {
  light: [
    'radial-gradient(circle at 62% 8%, rgb(95 196 222 / 0.34), transparent 38%)',
    'radial-gradient(circle at 10% 81%, rgb(150 140 235 / 0.24), transparent 34%)',
    'radial-gradient(circle at 96% 86%, rgb(255 190 130 / 0.3), transparent 24%)',
  ].join(', '),
  dark: [
    'radial-gradient(circle at 62% 8%, rgb(27 143 166 / 0.38), transparent 38%)',
    'radial-gradient(circle at 10% 81%, rgb(74 63 196 / 0.3), transparent 34%)',
    'radial-gradient(circle at 96% 86%, rgb(244 162 89 / 0.16), transparent 22%)',
  ].join(', '),
};

/** Glass Harbor — dark glass over a navy harbor glow. */
const glassHarbor: Theme = {
  id: 'glass-harbor',
  name: 'Glass Harbor',
  description:
    'Cyan brand and amber harbor lights on deep navy under dark glass; light mode is its pale sea-glass counterpart.',
  tags: ['authored', 'glass', 'cool', 'navy', 'cyan'],
  light: glassHarborLight,
  dark: glassHarborDark,
  radius: ThemeRadius.Lg,
  ambient: glassHarborAmbient,
  status: ThemeStatus.Candidate,
  meta: validateTheme({ light: glassHarborLight, dark: glassHarborDark }),
};

/* ---------------------------------------------------------------------------
 * Frost — deep teal brand on a blue, lavender and peach wash, under frosted glass.
 * Light is the drawn direction; dark is its cool slate night.
 * ------------------------------------------------------------------------- */

const frostLight: TokenSet = ensureForegroundContrast({
  background: '#eef3f8',
  foreground: '#15233a',
  card: '#f8fafd',
  'card-foreground': '#15233a',
  popover: '#ffffff',
  'popover-foreground': '#15233a',
  field: '#ffffff',
  muted: '#e3e9f0',
  'muted-foreground': '#4d5d74',
  'subtle-foreground': '#7b889c',
  inverse: '#15233a',
  'inverse-foreground': '#f4f7fb',
  border: '#dbe3ec',
  'border-strong': '#c3cedb',
  input: '#d0d9e4',
  ring: '#1f6f8b',
  primary: '#1f6f8b',
  'primary-foreground': '#ffffff',
  'primary-soft': '#dcebf1',
  'primary-soft-foreground': '#185a71',
  accent: '#6252d8',
  'accent-foreground': '#ffffff',
  'accent-soft': '#ebe8fb',
  'accent-soft-foreground': '#4838b8',
  destructive: '#c23349',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#fbe4e7',
  'destructive-soft-foreground': '#9e2b3b',
  info: '#2a67ad',
  'info-foreground': '#ffffff',
  'info-soft': '#e1ecf8',
  'info-soft-foreground': '#1f5390',
  success: '#1d7a6e',
  'success-foreground': '#ffffff',
  'success-soft': '#dff3ef',
  'success-soft-foreground': '#1c6e64',
  warning: '#e9a23b',
  'warning-foreground': '#3d2503',
  'warning-soft': '#fdebd7',
  'warning-soft-foreground': '#8a4b0f',
});

const frostDark: TokenSet = ensureForegroundContrast({
  background: '#10131d',
  foreground: '#eef1f8',
  card: '#1a1e2b',
  'card-foreground': '#eef1f8',
  popover: '#202536',
  'popover-foreground': '#eef1f8',
  field: '#10131d',
  muted: '#161a26',
  'muted-foreground': '#a3adc2',
  'subtle-foreground': '#737e95',
  inverse: '#eef1f8',
  'inverse-foreground': '#10131d',
  border: '#2a3042',
  'border-strong': '#3a4258',
  input: '#333a4f',
  ring: '#7cc7de',
  primary: '#7cc7de',
  'primary-foreground': '#06202b',
  'primary-soft': '#16303b',
  'primary-soft-foreground': '#a8e0f0',
  accent: '#a99cf5',
  'accent-foreground': '#16103a',
  'accent-soft': '#262245',
  'accent-soft-foreground': '#cdc5fb',
  destructive: '#f28b9b',
  'destructive-foreground': '#2a0a10',
  'destructive-soft': '#3a1821',
  'destructive-soft-foreground': '#ffb8c2',
  info: '#86b6f0',
  'info-foreground': '#071a33',
  'info-soft': '#17263d',
  'info-soft-foreground': '#b3d1f7',
  success: '#6fd4bf',
  'success-foreground': '#04241f',
  'success-soft': '#13302b',
  'success-soft-foreground': '#9fe7d7',
  warning: '#f2b766',
  'warning-foreground': '#2e1c04',
  'warning-soft': '#3a2b17',
  'warning-soft-foreground': '#f8d3a0',
});

const frostAmbient: ThemeAmbient = {
  light: [
    'radial-gradient(circle at 14% 11%, rgb(159 214 234 / 0.55), transparent 32%)',
    'radial-gradient(circle at 56% 47%, rgb(201 193 245 / 0.45), transparent 30%)',
    'radial-gradient(circle at 88% 78%, rgb(255 201 163 / 0.55), transparent 32%)',
    'linear-gradient(160deg, #e7f1fa 0%, #f3f0f8 55%, #fbf1e7 100%)',
  ].join(', '),
  dark: [
    'radial-gradient(circle at 14% 11%, rgb(56 120 150 / 0.3), transparent 34%)',
    'radial-gradient(circle at 56% 47%, rgb(98 82 216 / 0.16), transparent 32%)',
    'radial-gradient(circle at 88% 78%, rgb(214 132 84 / 0.14), transparent 32%)',
    'linear-gradient(160deg, #111827 0%, #12131f 55%, #17131a 100%)',
  ].join(', '),
};

/** Frost — light frosted glass over a pastel wash. */
const frost: Theme = {
  id: 'frost',
  name: 'Frost',
  description:
    'Deep teal brand on a blue, lavender and peach wash under frosted glass; dark mode is its cool slate night.',
  tags: ['authored', 'glass', 'light', 'teal', 'pastel'],
  light: frostLight,
  dark: frostDark,
  radius: ThemeRadius.Lg,
  ambient: frostAmbient,
  status: ThemeStatus.Candidate,
  meta: validateTheme({ light: frostLight, dark: frostDark }),
};

/* ---------------------------------------------------------------------------
 * Bento Deck — teal brand and pastel tone tiles on warm paper, with ink surfaces.
 * Flat by design: solid tiles, no glass, so no ambient backdrop.
 * ------------------------------------------------------------------------- */

const bentoDeckLight: TokenSet = ensureForegroundContrast({
  background: '#f1eee8',
  foreground: '#1b1f2a',
  card: '#ffffff',
  'card-foreground': '#1b1f2a',
  popover: '#ffffff',
  'popover-foreground': '#1b1f2a',
  field: '#ffffff',
  muted: '#e9e4da',
  'muted-foreground': '#545a6b',
  'subtle-foreground': '#7f838e',
  inverse: '#1b1f2a',
  'inverse-foreground': '#f4f1ea',
  border: '#e2ddd2',
  'border-strong': '#cfc8bb',
  input: '#d9d4ca',
  ring: '#1f5f7a',
  primary: '#1f5f7a',
  'primary-foreground': '#ffffff',
  'primary-soft': '#dcebf0',
  'primary-soft-foreground': '#1b5068',
  accent: '#6b55a8',
  'accent-foreground': '#ffffff',
  'accent-soft': '#ebe4f5',
  'accent-soft-foreground': '#4a3a6b',
  destructive: '#c4413c',
  'destructive-foreground': '#ffffff',
  'destructive-soft': '#f8e1df',
  'destructive-soft-foreground': '#8f2d29',
  info: '#2e6aa6',
  'info-foreground': '#ffffff',
  'info-soft': '#e3ecf7',
  'info-soft-foreground': '#2e4a6b',
  success: '#2d7f63',
  'success-foreground': '#ffffff',
  'success-soft': '#dff0ea',
  'success-soft-foreground': '#2d5a4e',
  warning: '#e0a24a',
  'warning-foreground': '#3a2508',
  'warning-soft': '#f6e5d3',
  'warning-soft-foreground': '#6b4520',
});

const bentoDeckDark: TokenSet = ensureForegroundContrast({
  background: '#14161c',
  foreground: '#f1eee8',
  card: '#1d2029',
  'card-foreground': '#f1eee8',
  popover: '#232733',
  'popover-foreground': '#f1eee8',
  field: '#14161c',
  muted: '#262a34',
  'muted-foreground': '#a9adb9',
  'subtle-foreground': '#7b808d',
  inverse: '#f1eee8',
  'inverse-foreground': '#14161c',
  border: '#2b2f3a',
  'border-strong': '#3b404d',
  input: '#353a46',
  ring: '#7fbfd8',
  primary: '#7fbfd8',
  'primary-foreground': '#0a2330',
  'primary-soft': '#18303b',
  'primary-soft-foreground': '#a9d8ea',
  accent: '#b3a1ea',
  'accent-foreground': '#1d1438',
  'accent-soft': '#2a2340',
  'accent-soft-foreground': '#d3c7f5',
  destructive: '#f08a84',
  'destructive-foreground': '#2b0b09',
  'destructive-soft': '#3a1b1a',
  'destructive-soft-foreground': '#f9bdb8',
  info: '#8fb8e8',
  'info-foreground': '#0b1b30',
  'info-soft': '#1b2a3e',
  'info-soft-foreground': '#bcd4f2',
  success: '#7fd3b2',
  'success-foreground': '#06261b',
  'success-soft': '#173129',
  'success-soft-foreground': '#a6e5cc',
  warning: '#f0c07a',
  'warning-foreground': '#2e1f07',
  'warning-soft': '#35291a',
  'warning-soft-foreground': '#f5d3a3',
});

/** Bento Deck — flat pastel tiles on warm paper. */
const bentoDeck: Theme = {
  id: 'bento-deck',
  name: 'Bento Deck',
  description:
    'Teal brand and pastel tone tiles on warm paper with ink surfaces; flat, no glass; dark mode is warm charcoal.',
  tags: ['authored', 'warm', 'paper', 'pastel', 'flat'],
  light: bentoDeckLight,
  dark: bentoDeckDark,
  radius: ThemeRadius.Lg,
  status: ThemeStatus.Candidate,
  meta: validateTheme({ light: bentoDeckLight, dark: bentoDeckDark }),
};

/* ---------------------------------------------------------------------------
 * Harbor Frost — the merged direction: Frost by day, Glass Harbor by night.
 * Both modes reuse the sets above, so a fix to either direction lands here too.
 * ------------------------------------------------------------------------- */

/** Harbor Frost — Frost's light glass paired with Glass Harbor's dark glass. */
const harborFrost: Theme = {
  id: 'harbor-frost',
  name: 'Harbor Frost',
  description: "Frost's light glass by day and Glass Harbor's dark glass by night; the merged Wheelhouse direction.",
  tags: ['authored', 'glass', 'merged', 'teal', 'navy'],
  light: frostLight,
  dark: glassHarborDark,
  radius: ThemeRadius.Lg,
  ambient: { light: frostAmbient.light, dark: glassHarborAmbient.dark },
  status: ThemeStatus.Candidate,
  meta: validateTheme({ light: frostLight, dark: glassHarborDark }),
};

/** The authored themes: the validated platform theme, the two app palettes, then the four Wheelhouse directions. */
export const AuthoredThemes: ReadonlyArray<Theme> = [
  platform,
  smartQr,
  ocharo,
  glassHarbor,
  frost,
  bentoDeck,
  harborFrost,
];
