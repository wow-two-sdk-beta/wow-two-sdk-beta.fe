# Theming — `@wow-two-beta/ui`

How to **use a theme**, what a theme actually is, its **lifecycle** (validated vs candidate), and how to **make a new one**. Written for two readers: a human consumer wiring a theme into an app, and Claude doing the same on request ("use theme `smart-qr`", "generate a brand theme from this hue").

A theme is a complete set of semantic **color** tokens for **both** light and dark mode, scoped to a `.theme-{id}` class. Switching themes = swapping that class. No rebuild, no JS, no flash.

> A theme is **colors only** — the 39 semantic tokens, plus three optional knobs: `radius`, a glass theme's `ambient` backdrop and its `glass` strength ([Glass themes](#glass-themes--the-ambient-backdrop)). App-specific extras (fonts like Geist, surface treatments, custom radii beyond the `radius` knob) are **layered separately** in the app, not baked into the theme. A theme makes any app *consistent*; it doesn't make every app *identical*.

---

## TL;DR — use a curated theme

```ts
// once, at your app entry (ships the .theme-* + .dark.theme-* CSS):
import '@wow-two-beta/ui/styles.css';   // base @theme tokens + component styles
import '@wow-two-beta/ui/themes.css';   // every curated theme as a scoped block
```

```html
<!-- apply: theme id on a root element, .dark for dark mode -->
<html class="theme-smart-qr">          <!-- light -->
<html class="theme-smart-qr dark">     <!-- dark  -->
```

That's it. Every `--color-*` token under that subtree resolves to the theme's palette; all `@wow-two-beta/ui` components and your own Tailwind utilities (`bg-primary`, `text-muted-foreground`, …) follow automatically.

> **For production, prefer a `validated` id** (e.g. `smart-qr`) — it's been proven on a real app surface, so it's safe to drop into any app without rethinking. `candidate` ids are AA-proven but not yet app-validated; fine for prototypes. See [Theme lifecycle](#theme-lifecycle).

> `styles.css` declares the **default** theme (`wow`) inline via `@theme`, so the library is themed out-of-the-box. You only need `themes.css` + a `theme-{id}` class to switch to a *different* theme.

---

## What ships

| Artifact | Subpath export | Contents |
|---|---|---|
| Base styles | `@wow-two-beta/ui/styles.css` | `@theme` tokens (default `wow`) + component CSS |
| All themes (CSS) | `@wow-two-beta/ui/themes.css` | One `.theme-{id}` + `.dark.theme-{id}` block per curated theme |
| Manifest (JSON) | `@wow-two-beta/ui/themes.json` | `{ id, name, description, tags, status, contrastAA }[]` — list/filter (incl. by `status`) without parsing CSS |
| Engine (JS/TS) | `@wow-two-beta/ui/themes` | `THEMES`, `getTheme`, `generateTheme`, validator, emitters, OKLCH math |

Build wiring: `pnpm build` runs `tsup` → then `scripts/build-themes-css.mjs` emits `dist/themes.css` + `dist/themes.json` from the curated registry. (Filenames are flat under `dist/` — `dist/themes.css`, `dist/themes.json` — exposed via the subpaths above.)

---

## The token contract

A theme supplies a CSS color string for **every** semantic token, in **both** modes. The keys are the `--color-*` names declared in `src/index.css`; the emitter writes them back as `--color-{key}` under the theme's scope. (Source of truth: `src/themes/Tokens.ts`.)

**Surface / chrome (15):**

```
background  foreground
card  card-foreground
popover  popover-foreground
muted  muted-foreground  subtle-foreground
inverse  inverse-foreground
border  border-strong  input  ring
```

**Tone families (6 × 4 slots = 24):** each of `primary · accent · destructive · info · success · warning` expands to

```
{family}  {family}-foreground  {family}-soft  {family}-soft-foreground
```

→ **39 tokens total**, light + dark. Use them in Tailwind as `bg-{token}` / `text-{token}` / `border-{token}` (e.g. `bg-primary text-primary-foreground`, `bg-warning-soft text-warning-soft-foreground`).

> Adding a semantic token is a contract change: declare it in `src/index.css` **and** add the key to `Tokens.ts`, then the generator/validator/emitter must produce it. Keep them in lock-step.

**`contrastAA` is not `status`.** `meta.contrastAA === true` means every foreground↔surface pair clears its WCAG AA threshold in **both** modes — a *math* check. `status` is a *trust* level (has a human seen it in a real app). A theme can be AA-proven (`contrastAA: true`) yet still only a `candidate`. Both matter; don't conflate them.

---

## Theme lifecycle

Every theme carries a `status`: **`validated`** or **`candidate`**. This is the trust dial — it answers "can I drop this into a product without rethinking it?"

| Group | `status` | What it means | Use for |
|---|---|---|---|
| **Validated** | `validated` | Hand-authored from a **real, shipping app**'s tokens and visually verified by a human. Colors are **locked** — never re-derived. Safe to apply to **any** app as-is. | Production UI |
| **Candidate** | `candidate` | Generated from a seed, **AA-proven by the engine**, but **not yet** seen on a real app surface. A large, ready pool. | Prototypes, starting points, brand exploration |

> **Validated** starts with **one** theme: `smart-qr`. The other ~24 curated presets are **candidates** — AA-proven, ready to adopt, awaiting their first real-app validation.

> **Authored candidates** sit between the two: hand-authored palettes from a drawn design direction ([`src/foundation/themes/authored.ts`](./engineering/codebase/wow-two-front-beta-sdk/src/foundation/themes/authored.ts)). Their colors are locked like a validated theme's and clear AA, but no shipping app has proven them yet, so they stay `candidate` until one does.

### The validation flow — candidate → validated

How a candidate earns `validated` status (i.e. how the pool drains into the trusted set):

1. **Pick a candidate** — choose a curated id (or `generateTheme` a fresh one) and apply it in a real app.
2. **Adopt in the app** — wire `theme-{id}` + `.dark`, build real screens with it.
3. **Refine in the app** — if it *almost* works, tweak a few tokens locally (in the app's `index.css` overrides) until it looks right. This is expected — generated palettes get you 90% there.
4. **SYNC back** — copy the refined token values **back into the theme** in `src/themes/registry.ts` (for a seed-derived theme, this usually means promoting it to a hand-authored `validated.ts` entry so the exact colors are locked and not re-nudged by the generator).
5. **Flip status → `validated`** — set `status: ThemeStatus.Validated`, add the theme to `VALIDATED_THEMES`.
6. **Now reusable with confidence** — it's app-proven; any future app can apply it without re-checking.

The point: the *app* is the proving ground. A candidate becomes validated only after a human has seen its exact, locked colors render well in a shipping product.

### How `smart-qr` was extracted (the first validated theme)

`smart-qr` is the worked example of step 4–5 — authored verbatim in [`src/themes/validated.ts`](./src/themes/validated.ts), not generated:

- The real Smart QR app themes itself two ways: its **own `index.css` overrides** (the bespoke violet/teal-on-lavender-grey palette) **plus** every token it *doesn't* override, which **inherits the lib defaults** (the `@theme` + `.dark` blocks in `src/index.css`).
- To make a *self-contained* theme that renders identically to the app, `validated.ts` reconstructs both layers: `LIB_DEFAULT_LIGHT` / `LIB_DEFAULT_DARK` (copied verbatim from `src/index.css`) are spread **first**, then the app's exact override hexes are applied **on top**. Tokens the app never set (e.g. the `destructive` / `info` / `success` / `warning` families) thus land on precisely the values the real app inherits.
- Colors are **locked**: a validated theme is **never** run back through `generateTheme` (that would AA-nudge and change the human-approved values). `validateTheme` is still run for transparency and recorded in `meta`, but `status` stays `validated` regardless of the AA verdict — the human validated it *visually*.

> Keeping the two `LIB_DEFAULT_*` maps in `validated.ts` in sync with `src/index.css` matters — if the lib defaults change, re-copy them so inherited tokens stay truthful.

---

## Curated themes

`THEMES` lists **validated first**, then the authored candidates, then the generated candidates (this is also the emitted-stylesheet / manifest order).

**Validated (1)** — app-proven, safe for production:

- `smart-qr` — Smart QR product theme: violet brand + teal accent on cool lavender-grey (light) / charcoal (dark).

**Authored candidates (4)** — hand-authored from Wheelhouse's design directions, AA-proven, radius `lg`:

- `glass-harbor` — cyan brand and amber harbor lights on deep navy under dark glass; light mode is pale sea glass. Has a backdrop.
- `frost` — deep teal brand on a blue, lavender and peach wash under frosted glass; dark mode is cool slate. Has a backdrop.
- `bento-deck` — teal brand and pastel tone tiles on warm paper with ink surfaces; flat, no backdrop.
- `harbor-frost` — the merge: `frost` light by day, `glass-harbor` dark by night, with each one's backdrop.

**Candidate (24)** — AA-proven, not yet app-validated:

`wow` (default) · `midnight` · `slate` · `ocean` · `forest` · `emerald` · `sunset` · `amber` · `rose` · `crimson` · `plum` · `grape` · `lavender` · `teal` · `cyan` · `mint` · `nord` · `solarized` · `dracula` · `gruvbox` · `monokai` · `mono` · `graphite` · `sand`.

Enumerate at runtime instead of hard-coding:

```ts
import {
  THEMES, THEME_IDS, getTheme,
  validatedThemes, candidateThemes,
} from '@wow-two-beta/ui/themes';

THEME_IDS;                 // ['smart-qr','glass-harbor',…,'wow',…] — validated first
getTheme('smart-qr')?.name;// 'Smart QR'
validatedThemes();         // [smart-qr] — app-proven, prefer for production
candidateThemes();         // the 24 curated presets — AA-proven, not app-validated
THEMES.filter(t => t.meta.contrastAA);   // any theme that clears AA (≠ status)
```

…or fetch the manifest (`@wow-two-beta/ui/themes.json`) — same shape (incl. `status`), no bundle cost.

---

## Switching at runtime

Themes are just classes, so a switcher is a class swap on the root element:

```ts
function applyTheme(id: string, dark: boolean) {
  const el = document.documentElement;
  el.classList.forEach(c => c.startsWith('theme-') && el.classList.remove(c));
  el.classList.add(`theme-${id}`);
  el.classList.toggle('dark', dark);
}
```

Dark mode is the library's existing `.dark` variant (`@custom-variant dark (&:where(.dark, .dark *))`) — `.dark` and `.theme-{id}` compose: `.dark.theme-{id}` selects the theme's dark token set.

---

## Glass themes — the ambient backdrop

Glass needs something behind it to blur. A theme may carry an `ambient` backdrop per mode: CSS `background-image` layers (soft radial glows over a base wash) that the emitter writes as `--theme-ambient` into the theme's light and dark blocks.

```html
<html class="theme-harbor-frost dark">
  <body class="surface-ambient">  <!-- paints var(--theme-ambient), fixed to the viewport -->
```

- `surface-ambient` (from `styles.css`) paints the backdrop; under a theme without one it paints nothing.
- Put panels on the `glass` / `glass-outline` surface variant: translucent `popover` fill plus `backdrop-blur`.
- The tokens stay opaque, so every contrast check still holds; the translucency comes from the surface variant.
- Authoring one: `Theme.ambient = { light, dark }`, each a comma-separated layer list.

### Glass strength

A theme may also set how strong its glass is: `Theme.glass = { light, dark }`, each a `ThemeGlassTokens` of CSS
values. The emitter writes them as custom properties into the theme's light and dark blocks; an unset one keeps the
SDK's own glass, and an app may set any of them on a subtree.

| Token | Property | Read by | Unset |
|---|---|---|---|
| `fill` | `--glass-fill` | `surface-glass` (top bar, bottom bar, cards), `glass`, `glass-outline` | card 75% · popover 70% |
| `sideFill` | `--glass-side-fill` | `surface-glass-side`, `glass-side` | `--glass-fill` |
| `menuFill` | `--glass-menu-fill` | `surface-glass-menu`, `glass-menu` | `--glass-fill`, else popover 70% |
| `blur` | `--glass-blur` | every glass surface | `12px` |
| `saturate` | `--glass-saturate` | every glass surface | `100%` |
| `edge` | `--glass-edge` | `border-glass-edge`, `glass-menu` | `--color-border` |
| `highlight` | `--glass-highlight` | added to every shadow as `inset 0 1px 0` | `transparent` |
| `shadow` | `--glass-shadow` | `shadow-(--glass-shadow)`, glass `Navbar` / `AppShellHeader` | none |
| `bottomShadow` | `--glass-bottom-shadow` | `shadow-(--glass-bottom-shadow)`, glass `BottomNavMenu` | none |
| `menuShadow` | `--glass-menu-shadow` | `shadow-(--glass-menu-shadow)`, `glass-menu` | Tailwind `shadow-lg` |

- `ocharo` carries the approved frame glass: light `fill` white 84%, `sideFill` 60%, `menuFill` 92%, `blur` 24px,
  `saturate` 120%; dark `#29292d` at 90% / 96% and `#212125` at 70%, `saturate` 100%. Its `bottomShadow` is the
  chrome `shadow` with its y offset negated, approved by the Ocharo owner on 2026-10-21.
- `bottomShadow` points up — a negative y offset — because a bottom bar lifts off the page above it; the chrome
  `shadow` falls downward, off a bottom bar's screen edge. The highlight still lines the bar's top edge.
- Frame surfaces: `AppShellHeader variant="glass"`, `AppShellSidebar variant="glass"`, `BottomNavMenu variant="glass"`
  and `variant="glass-menu"` on `DropdownMenuContent`, `PopoverContent`, `ModalContent`, `AccountMenu` and
  `AppSwitcherMenu`.
- Each material is the solid card (popover for menus) where `backdrop-filter` is unsupported and under
  `prefers-reduced-transparency`.

---

## Generate a new theme

Curated themes are produced from a small **seed** by the OKLCH generator — deterministic (same seed → same theme), perceptually-uniform, gamut-clamped, then validated for AA. No color library, no randomness.

```ts
import { generateTheme, validateTheme } from '@wow-two-beta/ui/themes';

const brand = generateTheme({
  id: 'acme',
  name: 'Acme',
  primaryHue: 265,            // 0–360, your brand hue — the only required color input
  neutralTemp: 'cool',        // 'cool' | 'neutral' | 'warm'  (default 'neutral')
  accentMode: 'complementary',// 'complementary' | 'analogous' | 'triadic' | 'mono' (default 'complementary')
  surface: 'crisp',           // 'soft' | 'crisp'  (default 'crisp')
  radius: 'md',               // 'sm' | 'md' | 'lg'  (optional)
  tags: ['brand'],            // generator also auto-tags temp/mode/scheme
});

brand.meta.contrastAA;        // true ⇒ proven; false ⇒ inspect brand.meta.failures
```

`ThemeSeed` → `Theme` shapes live in `src/themes/Theme.ts`. The result is the full light/dark `TokenSet` pair + `meta`.

**Emit CSS/JSON for a generated theme** (e.g. to ship a one-off app theme without adding it to the library registry):

```ts
import { generateTheme, themeToCss, emitThemesManifest } from '@wow-two-beta/ui/themes';

const theme = generateTheme({ id: 'acme', name: 'Acme', primaryHue: 265 });
const css = themeToCss(theme);          // `.theme-acme { … }` + `.dark.theme-acme { … }`
const manifest = emitThemesManifest([theme]);
// write css to a .css file your app imports; add `theme-acme` to your root element.
```

**Add it to the library as a `candidate`:** append the seed to `THEME_SEEDS` in `src/themes/registry.ts` (it is `THEME_SEEDS.map(generateTheme)`) — the generator stamps it `status: "candidate"`. Then `pnpm build` re-emits `dist/themes.css` + `dist/themes.json` with the new `.theme-{id}` block. Keep `meta.contrastAA === true` before shipping.

**Promote a candidate to `validated`:** once you've adopted it in a real app and refined a few tokens (see [Theme lifecycle](#theme-lifecycle)), sync the exact colors into a hand-authored entry in [`src/themes/validated.ts`](./src/themes/validated.ts) (spread `LIB_DEFAULT_*` then your app overrides), set `status: ThemeStatus.Validated`, and add it to `VALIDATED_THEMES`. Don't leave it as a seed — generated themes get re-nudged; validated colors must stay locked.

---

## Theme Studio

Live generator + previewer — tune a seed (hue, neutral temp, accent mode, surface), see every token and component update in real time, read the AA verdict, and copy the seed or the emitted CSS.

**URL:** https://wow-two-sdk-beta.github.io/wow-two-sdk-beta.ui/theme-studio

(Deployed alongside the [Storybook catalog](https://wow-two-sdk-beta.github.io/wow-two-sdk-beta.ui/) and the [Showcase](https://wow-two-sdk-beta.github.io/wow-two-sdk-beta.ui/showcase) on every release. Local: `pnpm --filter theme-studio dev`.)

---

## For Claude — "use theme X"

When asked to apply or create a theme in a consumer app:

1. **Ensure both stylesheets are imported once** at the app entry: `@wow-two-beta/ui/styles.css` then `@wow-two-beta/ui/themes.css`.
2. **Apply** by adding `theme-{id}` (and `dark` for dark mode) to the app's root element — don't hand-write `--color-*` overrides; the scoped block already defines all 39 tokens. (A theme is colors only — wire app fonts / surface treatments separately.)
3. **Pick a valid id** from `@wow-two-beta/ui/themes.json` / `THEME_IDS` (`getTheme(id)` returns `undefined` for unknown ids). **For production, prefer a `validated` id** (`validatedThemes()` — currently `smart-qr`); `candidate` ids are fine for prototypes. Within either group, prefer `contrastAA: true`.
4. **A new brand theme** → `generateTheme({ id, name, primaryHue })` (add `neutralTemp` / `accentMode` / `surface` to taste); verify `meta.contrastAA`. Emit with `themeToCss(theme)`, or register the seed in `src/themes/registry.ts` (ships as a `candidate`) and rebuild.
5. **Validating a theme** (candidate → validated) → adopt + refine it in the app, then sync the locked colors into `src/themes/validated.ts` with `status: ThemeStatus.Validated`. See [Theme lifecycle](#theme-lifecycle).
6. **Never** add a color library — the OKLCH engine in `src/themes/` is the only color math we use.
