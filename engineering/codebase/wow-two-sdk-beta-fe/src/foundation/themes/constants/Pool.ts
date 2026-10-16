/* ---------------------------------------------------------------------------
 * Candidate theme pool — a large, diverse, AA-proven catalog.
 *
 * Same contract as `ThemeSeeds` in `Registry.ts`: every entry is a `ThemeSeed`
 * expanded through `generateTheme`, so the whole pool is contrast-validated by
 * the engine and stamped `status: "candidate"`. These are *vibes*, not literal
 * clones — the seed captures hue family / neutral temperature / accent scheme /
 * surface character, and the OKLCH generator does the rest (AA-nudging included).
 *
 * Two cohorts:
 *   1. NAMED — popular dev/editor/brand palettes not already in the curated 24.
 *      One seed each, hue chosen to evoke the palette's signature brand color.
 *   2. SPECTRUM — a systematic hue sweep (~every 20-30°) crossed with a couple
 *      of accent modes / neutral temps, filling the wheel so any brand hue an
 *      app picks already has a near neighbour in the pool.
 *
 * `Registry.ts` imports `PoolSeeds` and appends it after the curated seeds, so
 * the final order is: smart-qr (authored candidate) → 24 curated candidates → this pool.
 *
 * Foundation layer — no upward imports (ESLint enforces).
 * ------------------------------------------------------------------------- */

import type { ThemeSeed } from '../Theme';

/* ===========================================================================
 * 1. NAMED — editor / brand palettes (vibe-matched, not cloned).
 *
 * Hues are eyeballed from each palette's signature accent (OKLCH degrees):
 *   ~25 red · ~45 orange · ~75 amber/olive · ~110 chartreuse · ~145 green ·
 *   ~165 emerald/teal · ~195 teal/cyan · ~225 azure · ~255 indigo ·
 *   ~285 violet · ~320 magenta · ~350 pink/rose.
 * Ids are kebab-case and unique vs the curated 24 + smart-qr.
 * ========================================================================= */

const NamedSeeds: ReadonlyArray<ThemeSeed> = [
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    description: 'Soft mauve brand on warm latte neutrals — the light Catppuccin flavour.',
    tags: ['editor', 'catppuccin', 'pastel', 'warm', 'soft'],
    primaryHue: 290,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappé',
    description: 'Muted mauve brand on cool slate — the mid Catppuccin flavour.',
    tags: ['editor', 'catppuccin', 'pastel', 'cool', 'muted'],
    primaryHue: 287,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    description: 'Lavender-mauve brand on deep cool neutrals — the darker Catppuccin flavour.',
    tags: ['editor', 'catppuccin', 'pastel', 'cool', 'soft'],
    primaryHue: 280,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    description: 'Pastel mauve brand on the darkest Catppuccin slate — cozy and dim.',
    tags: ['editor', 'catppuccin', 'pastel', 'cool', 'soft'],
    primaryHue: 283,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Indigo-blue brand on deep cool navy — neon-city night editor palette.',
    tags: ['editor', 'tokyo-night', 'cool', 'calm'],
    primaryHue: 252,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'tokyo-night-storm',
    name: 'Tokyo Night Storm',
    description: 'Soft blue brand on stormy blue-grey — the lighter-ground Tokyo Night variant.',
    tags: ['editor', 'tokyo-night', 'cool', 'muted'],
    primaryHue: 246,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'tokyo-night-light',
    name: 'Tokyo Night Light',
    description: 'Indigo brand on crisp cool paper — the daytime Tokyo Night.',
    tags: ['editor', 'tokyo-night', 'cool', 'light'],
    primaryHue: 250,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    description: 'Dusky rose brand on muted plum-grey — the cozy Rosé Pine vibe.',
    tags: ['editor', 'rose-pine', 'muted', 'soft', 'cool'],
    primaryHue: 350,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'rose-pine-moon',
    name: 'Rosé Pine Moon',
    description: 'Soft rose brand on a lighter moonlit plum ground — Rosé Pine Moon.',
    tags: ['editor', 'rose-pine', 'muted', 'soft', 'cool'],
    primaryHue: 345,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'rose-pine-dawn',
    name: 'Rosé Pine Dawn',
    description: 'Rose brand on warm parchment — the light Rosé Pine Dawn.',
    tags: ['editor', 'rose-pine', 'warm', 'soft', 'light'],
    primaryHue: 352,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    description: 'Hyperlink-blue brand on cool gunmetal — the Atom/One Dark classic.',
    tags: ['editor', 'one-dark', 'cool', 'calm'],
    primaryHue: 240,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'one-light',
    name: 'One Light',
    description: 'Blue brand on crisp neutral paper — the One Light editor theme.',
    tags: ['editor', 'one-light', 'neutral', 'light'],
    primaryHue: 240,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'ayu-dark',
    name: 'Ayu Dark',
    description: 'Warm amber brand on near-black ink — Ayu Dark’s signature glow.',
    tags: ['editor', 'ayu', 'warm', 'vibrant'],
    primaryHue: 60,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'ayu-mirage',
    name: 'Ayu Mirage',
    description: 'Amber-gold brand on muted blue-grey — the mid Ayu Mirage tone.',
    tags: ['editor', 'ayu', 'warm', 'muted'],
    primaryHue: 55,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'ayu-light',
    name: 'Ayu Light',
    description: 'Warm orange brand on bright paper — the daytime Ayu Light.',
    tags: ['editor', 'ayu', 'warm', 'light'],
    primaryHue: 48,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'everforest',
    name: 'Everforest',
    description: 'Soft moss-green brand on warm forest-grey — the gentle Everforest palette.',
    tags: ['editor', 'everforest', 'nature', 'warm', 'muted'],
    primaryHue: 135,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'everforest-light',
    name: 'Everforest Light',
    description: 'Moss green brand on warm cream — the light Everforest.',
    tags: ['editor', 'everforest', 'nature', 'warm', 'light'],
    primaryHue: 130,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'kanagawa',
    name: 'Kanagawa',
    description: 'Wave-blue brand on warm sumi-ink grey — inspired by Hokusai’s Great Wave.',
    tags: ['editor', 'kanagawa', 'cool', 'muted', 'warm'],
    primaryHue: 220,
    neutralTemp: 'warm',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'kanagawa-lotus',
    name: 'Kanagawa Lotus',
    description: 'Indigo brand on warm parchment — the light Kanagawa Lotus.',
    tags: ['editor', 'kanagawa', 'warm', 'light', 'muted'],
    primaryHue: 235,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Cyan-teal brand on deep midnight blue — a palette tuned for late-night coding.',
    tags: ['editor', 'night-owl', 'cool', 'vibrant'],
    primaryHue: 195,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'light-owl',
    name: 'Light Owl',
    description: 'Teal brand on crisp cool paper — the daytime Light Owl.',
    tags: ['editor', 'night-owl', 'cool', 'light'],
    primaryHue: 198,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    description: 'Hot-magenta brand with a cyan accent on deep purple-black — retro 80s neon.',
    tags: ['editor', 'synthwave', 'retro', 'vibrant', 'neon'],
    primaryHue: 320,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'outrun',
    name: 'Outrun',
    description: 'Sunset-orange brand with a violet accent on dark indigo — neon sunset drive.',
    tags: ['retro', 'synthwave', 'vibrant', 'warm', 'neon'],
    primaryHue: 32,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'material',
    name: 'Material',
    description: 'Indigo brand with a teal accent on neutral greys — the Material Design baseline.',
    tags: ['brand', 'material', 'neutral', 'classic'],
    primaryHue: 255,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'material-ocean',
    name: 'Material Ocean',
    description: 'Bright blue brand on deep ocean-navy — the Material Theme Ocean variant.',
    tags: ['editor', 'material', 'cool', 'calm'],
    primaryHue: 225,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'palenight',
    name: 'Palenight',
    description: 'Soft violet brand on dim blue-grey — the mellow Material Palenight.',
    tags: ['editor', 'material', 'cool', 'muted', 'soft'],
    primaryHue: 270,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'oceanic-next',
    name: 'Oceanic Next',
    description: 'Teal-blue brand on slate navy — the Oceanic Next editor palette.',
    tags: ['editor', 'oceanic', 'cool', 'calm'],
    primaryHue: 200,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Coral-rose brand with a cyan accent on warm plum-charcoal — the warm Horizon palette.',
    tags: ['editor', 'horizon', 'warm', 'vibrant'],
    primaryHue: 5,
    neutralTemp: 'warm',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    description: 'GitHub-blue brand on cool slate — the dark GitHub interface palette.',
    tags: ['brand', 'github', 'cool', 'professional'],
    primaryHue: 235,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    description: 'GitHub-blue brand on crisp neutral white — the light GitHub interface.',
    tags: ['brand', 'github', 'neutral', 'professional', 'light'],
    primaryHue: 235,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'github-dimmed',
    name: 'GitHub Dimmed',
    description: 'GitHub-blue brand on softened slate — the low-glare GitHub Dimmed mode.',
    tags: ['brand', 'github', 'cool', 'muted'],
    primaryHue: 233,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'soft',
  },
  {
    id: 'cobalt2',
    name: 'Cobalt2',
    description: 'Electric cobalt brand with an amber accent on deep navy — Wes Bos’ Cobalt2.',
    tags: ['editor', 'cobalt', 'cool', 'vibrant'],
    primaryHue: 228,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'panda',
    name: 'Panda',
    description: 'Pink-magenta brand with a cyan accent on near-black grey — the friendly Panda Syntax.',
    tags: ['editor', 'panda', 'vibrant', 'neutral'],
    primaryHue: 335,
    neutralTemp: 'neutral',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    description: 'Warm yellow-amber brand with a magenta accent on warm charcoal — Monokai Pro.',
    tags: ['editor', 'monokai', 'warm', 'vibrant'],
    primaryHue: 70,
    neutralTemp: 'warm',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Cyan-blue brand on the deep teal-grey Solarized base — the dark Solarized.',
    tags: ['editor', 'solarized', 'cool', 'muted'],
    primaryHue: 205,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'soft',
  },
  {
    id: 'gruvbox-light',
    name: 'Gruvbox Light',
    description: 'Warm orange brand on retro cream — the light Gruvbox.',
    tags: ['editor', 'gruvbox', 'warm', 'retro', 'light'],
    primaryHue: 45,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'gruvbox-material',
    name: 'Gruvbox Material',
    description: 'Softened amber brand on muted warm grey — the gentler Gruvbox Material.',
    tags: ['editor', 'gruvbox', 'warm', 'retro', 'muted'],
    primaryHue: 52,
    neutralTemp: 'warm',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'nord-light',
    name: 'Nord Light',
    description: 'Frost-blue brand on bright arctic snow — the light counterpart to Nord.',
    tags: ['editor', 'nord', 'cool', 'muted', 'light'],
    primaryHue: 213,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Frost-green brand with a violet accent on cool slate — Nord’s Aurora highlights.',
    tags: ['editor', 'nord', 'cool', 'nature'],
    primaryHue: 150,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'dracula-pro',
    name: 'Dracula Pro',
    description: 'Refined purple brand with a pink accent on warm-tinted charcoal — Dracula Pro.',
    tags: ['editor', 'dracula', 'vibrant', 'cool'],
    primaryHue: 268,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'shades-of-purple',
    name: 'Shades of Purple',
    description: 'Royal violet brand with a gold accent on deep indigo — the bold SoP palette.',
    tags: ['editor', 'purple', 'vibrant', 'cool'],
    primaryHue: 275,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'winter-is-coming',
    name: 'Winter is Coming',
    description: 'Cool blue brand on icy slate — the crisp Winter-is-Coming editor theme.',
    tags: ['editor', 'cool', 'calm', 'muted'],
    primaryHue: 218,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Electric cyan brand with a hot-pink accent on black — high-voltage neon.',
    tags: ['retro', 'neon', 'vibrant', 'cool'],
    primaryHue: 192,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'spacegray',
    name: 'Spacegray',
    description: 'Muted blue brand on understated cool grey — the calm Spacegray UI.',
    tags: ['editor', 'cool', 'muted', 'minimal'],
    primaryHue: 210,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'github-copilot',
    name: 'Copilot',
    description: 'Teal-cyan brand on neutral slate — a calm assistant-inspired palette.',
    tags: ['brand', 'cool', 'fresh', 'professional'],
    primaryHue: 185,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Pure achromatic brand on stark neutral greys — the high-contrast Vercel look.',
    tags: ['brand', 'neutral', 'minimal', 'grayscale'],
    primaryHue: 0,
    neutralTemp: 'neutral',
    accentMode: 'mono',
    surface: 'crisp',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Indigo-violet brand with an analogous accent on cool neutrals — the Stripe brand feel.',
    tags: ['brand', 'cool', 'professional', 'vibrant'],
    primaryHue: 258,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Vivid green brand on near-black neutral — the energetic streaming-app palette.',
    tags: ['brand', 'nature', 'vibrant', 'neutral'],
    primaryHue: 145,
    neutralTemp: 'neutral',
    accentMode: 'analogous',
    surface: 'crisp',
  },
  {
    id: 'firewatch',
    name: 'Firewatch',
    description: 'Sunset-orange brand with a teal accent on dusky blue — inspired by the game’s vistas.',
    tags: ['nature', 'warm', 'vibrant', 'cool'],
    primaryHue: 28,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'soft',
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    description: 'Magenta-pink brand with a green accent on deep space-blue — the vivid Andromeda palette.',
    tags: ['editor', 'vibrant', 'cool', 'neon'],
    primaryHue: 330,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'bluloco-light',
    name: 'Bluloco Light',
    description: 'Saturated blue brand on crisp paper — the punchy Bluloco Light.',
    tags: ['editor', 'cool', 'vibrant', 'light'],
    primaryHue: 230,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'noctis',
    name: 'Noctis',
    description: 'Teal brand on deep blue-green ink — the legible Noctis editor palette.',
    tags: ['editor', 'cool', 'fresh', 'muted'],
    primaryHue: 180,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'min-dark',
    name: 'Min Dark',
    description: 'Restrained cyan brand on pure dark neutral — the minimal Miniml/Min theme.',
    tags: ['editor', 'minimal', 'cool', 'neutral'],
    primaryHue: 190,
    neutralTemp: 'neutral',
    accentMode: 'mono',
    surface: 'crisp',
  },
  {
    id: 'poimandres',
    name: 'Poimandres',
    description: 'Teal-cyan brand on deep blue-grey — the muted, modern Poimandres palette.',
    tags: ['editor', 'cool', 'muted', 'calm'],
    primaryHue: 188,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'flexoki',
    name: 'Flexoki',
    description: 'Warm red-brown brand on inky warm paper — the analog Flexoki palette.',
    tags: ['editor', 'warm', 'muted', 'paper'],
    primaryHue: 25,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'zenburn',
    name: 'Zenburn',
    description: 'Muted olive-tan brand on low-contrast warm grey — the classic low-glare Zenburn.',
    tags: ['editor', 'warm', 'muted', 'low-contrast'],
    primaryHue: 95,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'oxocarbon',
    name: 'Oxocarbon',
    description: 'Magenta-violet brand with a cyan accent on pure carbon grey — IBM-inspired Oxocarbon.',
    tags: ['editor', 'vibrant', 'neutral', 'cool'],
    primaryHue: 300,
    neutralTemp: 'neutral',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'iceberg',
    name: 'Iceberg',
    description: 'Cool periwinkle-blue brand on icy blue-grey — the restrained Iceberg palette.',
    tags: ['editor', 'cool', 'muted', 'calm'],
    primaryHue: 245,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Muted khaki-green brand on warm dark grey — the low-key Apprentice terminal palette.',
    tags: ['editor', 'warm', 'muted', 'low-contrast'],
    primaryHue: 100,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'tomorrow-night',
    name: 'Tomorrow Night',
    description: 'Calm blue brand on neutral charcoal — the balanced Tomorrow Night classic.',
    tags: ['editor', 'cool', 'calm', 'neutral'],
    primaryHue: 222,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'embark',
    name: 'Embark',
    description: 'Violet brand with a teal accent on deep blue-purple — the vivid Embark palette.',
    tags: ['editor', 'vibrant', 'cool'],
    primaryHue: 278,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'soft',
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    description: 'Periwinkle-violet brand on deep blue night — the dreamy Moonlight II palette.',
    tags: ['editor', 'cool', 'calm', 'soft'],
    primaryHue: 262,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'bearded',
    name: 'Bearded',
    description: 'Magenta brand with a green accent on cool charcoal — a bold Bearded-style palette.',
    tags: ['editor', 'vibrant', 'cool'],
    primaryHue: 315,
    neutralTemp: 'cool',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'city-lights',
    name: 'City Lights',
    description: 'Steel-blue brand on deep blue-grey — the muted, urban City Lights palette.',
    tags: ['editor', 'cool', 'muted', 'calm'],
    primaryHue: 205,
    neutralTemp: 'cool',
    accentMode: 'analogous',
    surface: 'soft',
  },
  {
    id: 'snazzy',
    name: 'Snazzy',
    description: 'Bright cyan brand with a magenta accent on near-black — the punchy Hyper Snazzy.',
    tags: ['terminal', 'vibrant', 'cool', 'neon'],
    primaryHue: 188,
    neutralTemp: 'cool',
    accentMode: 'triadic',
    surface: 'crisp',
  },
  {
    id: 'tomorrow-light',
    name: 'Tomorrow',
    description: 'Soft blue brand on clean neutral paper — the original light Tomorrow.',
    tags: ['editor', 'neutral', 'calm', 'light'],
    primaryHue: 222,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'paper-color',
    name: 'PaperColor',
    description: 'Crisp blue brand on bright paper-white — the print-like PaperColor light theme.',
    tags: ['editor', 'neutral', 'paper', 'light'],
    primaryHue: 228,
    neutralTemp: 'neutral',
    accentMode: 'complementary',
    surface: 'crisp',
  },
  {
    id: 'quietlight',
    name: 'Quiet Light',
    description: 'Olive-green brand on warm cream — the soft, low-contrast Quiet Light.',
    tags: ['editor', 'warm', 'soft', 'light'],
    primaryHue: 110,
    neutralTemp: 'warm',
    accentMode: 'analogous',
    surface: 'soft',
  },
];

/* ===========================================================================
 * 2. SPECTRUM — systematic hue sweep filling the wheel.
 *
 * For a set of evenly-spaced hues (~every 24°), emit a few seeds varying the
 * accent mode / neutral temp / surface so the catalog covers the full circle
 * with diverse moods. Ids are `spectrum-{hue}-{accentInitial}{tempInitial}`,
 * e.g. `spectrum-204-ac` (hue 204, analogous, cool). Names are the hue's color
 * family + a descriptor so they read like real presets, not coordinates.
 * ========================================================================= */

/** A point on the wheel: hue + a human color-family label. */
interface HueStop {
  hue: number;
  /** Color-family word used to name the spectrum presets at this hue. */
  family: string;

  /** Mood/lightness word that pairs with the family for the display name. */
  word: string;
}

/** Evenly-spaced stops around the wheel (~24° apart), each with a real name. */
const HueStops: ReadonlyArray<HueStop> = [
  { hue: 0, family: 'Scarlet', word: 'Ember' },
  { hue: 24, family: 'Coral', word: 'Flare' },
  { hue: 48, family: 'Marigold', word: 'Glow' },
  { hue: 72, family: 'Citron', word: 'Zest' },
  { hue: 96, family: 'Chartreuse', word: 'Sprout' },
  { hue: 120, family: 'Clover', word: 'Meadow' },
  { hue: 144, family: 'Jade', word: 'Grove' },
  { hue: 168, family: 'Spruce', word: 'Tide' },
  { hue: 192, family: 'Lagoon', word: 'Reef' },
  { hue: 216, family: 'Cerulean', word: 'Drift' },
  { hue: 240, family: 'Sapphire', word: 'Dusk' },
  { hue: 264, family: 'Iris', word: 'Nocturne' },
  { hue: 288, family: 'Orchid', word: 'Bloom' },
  { hue: 312, family: 'Fuchsia', word: 'Pulse' },
  { hue: 336, family: 'Magenta', word: 'Blush' },
];

/** Accent-mode → id initial + descriptive word for the description. */
const AccentVariants: { mode: ThemeSeed['accentMode']; init: string; word: string }[] = [
  { mode: 'complementary', init: 'x', word: 'complementary' },
  { mode: 'analogous', init: 'a', word: 'analogous' },
  { mode: 'triadic', init: 't', word: 'triadic' },
];

/** Neutral-temp → id initial + descriptive word. */
const TempVariants: { temp: ThemeSeed['neutralTemp']; init: string }[] = [
  { temp: 'cool', init: 'c' },
  { temp: 'warm', init: 'w' },
];

/**
 * Build the spectrum sweep: for each hue stop, cross (3 accent modes × 2 temps),
 * alternating surface so the pool isn't monotonous. 15 hues × 6 = 90 seeds.
 */
function buildSpectrumSeeds(): ReadonlyArray<ThemeSeed> {
  const seeds: Array<ThemeSeed> = [];
  for (const stop of HueStops) {
    let i = 0;
    for (const accent of AccentVariants) {
      for (const temp of TempVariants) {
        // Alternate surface across the 6 variants for visual variety.
        const surface: ThemeSeed['surface'] = i % 2 === 0 ? 'crisp' : 'soft';
        const tempWord = temp.temp === 'cool' ? 'cool' : 'warm';
        seeds.push({
          id: `spectrum-${stop.hue}-${accent.init}${temp.init}`,
          name: `${stop.family} ${stop.word}`,
          description: `${stop.family} brand at hue ${stop.hue}° — ${accent.word} accent on ${tempWord} neutrals (${surface} surfaces).`,
          tags: ['spectrum', 'sweep', stop.family.toLowerCase(), tempWord, accent.word],
          primaryHue: stop.hue,
          neutralTemp: temp.temp,
          accentMode: accent.mode,
          surface,
        });
        i++;
      }
    }
  }
  return seeds;
}

const SpectrumSeeds: ReadonlyArray<ThemeSeed> = buildSpectrumSeeds();

/* ===========================================================================
 * Exported pool — named cohort first, then the spectrum sweep.
 * `Registry.ts` appends this after the curated 24, all expanded via
 * `generateTheme` (→ `status: "candidate"`).
 * ========================================================================= */

/** The full candidate pool seeds (named editor/brand palettes + hue sweep). */
export const PoolSeeds: ReadonlyArray<ThemeSeed> = [...NamedSeeds, ...SpectrumSeeds];
