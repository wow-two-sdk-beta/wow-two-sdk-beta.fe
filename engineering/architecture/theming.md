# Theming

How `@wow-two-beta/ui` colors are organized, how to switch dark mode, and how consumers override tokens.

> All colors are defined as CSS variables inside `src/index.css` (shipped as `dist/index.css`, exposed at `@wow-two-beta/ui/styles.css`). Tailwind v4's `@theme` directive consumes them and emits matching utility classes (`bg-primary`, `text-foreground`, `border-border`, etc.).

---

## Philosophy

- **Two layers, single source of truth.** Raw color scales (`brand`, `success`, `warning`, `danger`, `info` — full 50–950 ranges) coexist with **semantic tokens** (`background`, `foreground`, `primary`, `destructive`, …) that flip in dark mode.
- **Components consume semantic tokens by default.** Raw scales are an escape hatch when a specific shade is genuinely required.
- **Dark mode is automatic.** Components do not write `dark:` modifiers — toggling `.dark` on the body re-binds the semantic CSS variables, and every utility built from those variables reflects the swap.
- **Consumers override at any layer.** Re-define a single CSS variable in their own CSS to retheme one token; redefine all 24 to fully reskin.

---

## Token layers

### 1. Raw scales (escape hatch)

Static palettes — never flip in dark mode. Use directly only when a component needs a specific shade outside the semantic vocabulary.

| Scale | Shades emitted | Notes |
|---|---|---|
| `brand` | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | Custom blue |
| `neutral` | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | Tailwind v4 defaults — not re-emitted by us |
| `success` | 50, 100, 500, 600, 700, 900 | Tailwind green |
| `warning` | 50, 100, 500, 600, 700, 900 | Tailwind amber |
| `danger` | 50, 100, 500, 600, 700, 900 | Tailwind red |
| `info` | 50, 100, 500, 600, 700, 900 | Tailwind cyan |

Utility classes follow the standard Tailwind shape: `bg-brand-600`, `text-success-700`, `border-danger-500`, `ring-info-300`, etc.

### 2. Semantic tokens (default surface)

The 24 tokens every atom uses. Flip in `.dark { … }`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` | `#ffffff` | `#09090b` | Page bg |
| `foreground` | `#18181b` | `#fafafa` | Body text |
| `muted` | `#f4f4f5` | `#18181b` | Subtle bg (inputs, code blocks, surfaces) |
| `muted-foreground` | `#71717a` | `#a1a1aa` | Secondary text |
| `subtle-foreground` | `#a1a1aa` | `#71717a` | Tertiary text (placeholders, icons) |
| `card` | `#ffffff` | `#18181b` | Raised surfaces (Card, Tag) |
| `card-foreground` | `#18181b` | `#fafafa` | Text on `card` |
| `popover` | `#ffffff` | `#18181b` | Overlays (Toast, Popover, Menu) |
| `popover-foreground` | `#18181b` | `#fafafa` | Text on `popover` |
| `inverse` | `#18181b` | `#fafafa` | Solid inverted surfaces (BannerSimple neutral) |
| `inverse-foreground` | `#fafafa` | `#09090b` | Text on `inverse` |
| `border` | `#e4e4e7` | `#27272a` | Default hairlines |
| `border-strong` | `#d4d4d8` | `#3f3f46` | Hover-emphasized borders |
| `input` | `#d4d4d8` | `#3f3f46` | Form-control borders (separate so consumers can tint inputs only) |
| `ring` | `#3b82f6` | `#60a5fa` | Focus ring |
| `primary` | `#2563eb` | `#3b82f6` | Brand-solid bg |
| `primary-foreground` | `#ffffff` | `#ffffff` | Text on `primary` |
| `primary-soft` | `#dbeafe` | `#1e3a8a` | Brand-tint bg (Badge, Tag) |
| `primary-soft-foreground` | `#1d4ed8` | `#dbeafe` | Text on `primary-soft` |
| `destructive` | `#dc2626` | `#ef4444` | Danger-solid bg |
| `destructive-foreground` | `#ffffff` | `#ffffff` | Text on `destructive` |
| `destructive-soft` | `#fef2f2` | `#7f1d1d` | Danger-tint bg |
| `destructive-soft-foreground` | `#b91c1c` | `#fee2e2` | Text on `destructive-soft` |
| `success` | `#16a34a` | `#22c55e` | Success-solid bg |
| `success-foreground` | `#ffffff` | `#ffffff` | Text on `success` |
| `success-soft` | `#f0fdf4` | `#14532d` | Success-tint bg |
| `success-soft-foreground` | `#15803d` | `#dcfce7` | Text on `success-soft` |
| `warning` | `#f59e0b` | `#f59e0b` | Warning-solid bg |
| `warning-foreground` | `#78350f` | `#78350f` | Text on `warning` (dark for contrast on amber) |
| `warning-soft` | `#fffbeb` | `#78350f` | Warning-tint bg |
| `warning-soft-foreground` | `#b45309` | `#fef3c7` | Text on `warning-soft` |
| `info` | `#0891b2` | `#06b6d4` | Info-solid bg |
| `info-foreground` | `#ffffff` | `#ffffff` | Text on `info` |
| `info-soft` | `#ecfeff` | `#164e63` | Info-tint bg |
| `info-soft-foreground` | `#0e7490` | `#cffafe` | Text on `info-soft` |

> Each token in the table emits a Tailwind utility: `bg-{token}`, `text-{token}`, `border-{token}`, `ring-{token}`, etc. Tailwind v4 also makes the value itself accessible in CSS as `var(--color-{token})`.

---

## Dark mode

Toggle by adding/removing `class="dark"` on `<html>` or `<body>`. The package's `@custom-variant dark (&:where(.dark, .dark *))` matches both an ancestor and the element itself.

```ts
// follow OS preference + persist user choice
const stored = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = stored ? stored === 'dark' : prefersDark;
document.documentElement.classList.toggle('dark', isDark);
```

The package never flips the class itself — that's the consumer's responsibility (settings UI, OS sync, etc.). It also doesn't ship a toggle component (UI design is per-app).

### Storybook

`.storybook/preview.ts` adds a toolbar `theme` global (sun/moon) that toggles `.dark` on `<html>` via a decorator. Every story renders both modes by switching the toolbar.

---

## Overrides

### Override a single token

Re-declare the variable in your CSS, after our import:

```css
@import "tailwindcss";
@import "@wow-two-beta/ui/styles.css";

:root  { --color-primary: #9333ea; }   /* purple */
.dark  { --color-primary: #a855f7; }
```

`bg-primary` / `text-primary-foreground` / `ring-ring` everywhere now reflect the new value.

### Full reskin

Redefine all 24 semantic tokens in your own CSS file and import it after ours. Component classes don't change.

### App-specific themes (multiple themes per app)

Wrap a section of the DOM in a `[data-theme="…"]` attribute and re-bind the variables there:

```css
[data-theme="ocean"] {
  --color-primary: #0891b2;
  --color-primary-foreground: #ffffff;
  --color-primary-soft: #cffafe;
  --color-primary-soft-foreground: #0e7490;
  /* etc. */
}
[data-theme="ocean"].dark {
  --color-primary: #22d3ee;
  /* … */
}
```

Toggle by setting `data-theme` on a wrapper element. CSS variable lookup is scoped, so different sections of the same page can use different themes.

---

## Glass strength

The translucent surfaces read a separate set of custom properties, not `--color-*` tokens: `--glass-fill`,
`--glass-side-fill`, `--glass-menu-fill`, `--glass-blur`, `--glass-saturate`, `--glass-edge`, `--glass-highlight`,
`--glass-shadow` and `--glass-menu-shadow`. Unset, every surface keeps the SDK's own glass; a theme sets them through
`Theme.glass`, and an app may set them on any subtree. Defaults, readers and the `ocharo` values:
[THEMES.md § Glass strength](../../THEMES.md#glass-strength). The materials and their fallbacks live in
`src/index.css` (`surface-glass`, `surface-glass-side`, `surface-glass-menu`).

---

## Tailwind v4 mechanics (the short version)

- `@theme { --color-* … }` — declares both a CSS variable on `:root` AND a Tailwind theme value used to generate utilities.
- Tailwind utilities reference the CSS variable (`bg-primary` → `background-color: var(--color-primary)`), so re-declaring the variable in `.dark { … }` propagates to every utility automatically.
- Opacity modifiers work via `color-mix`: `bg-primary/20` → `color-mix(in oklab, var(--color-primary) 20%, transparent)`.
- Custom variants like our `@custom-variant dark` are just CSS, not config — defined inline in `index.css`.

---

## Authoring rule for new components

1. **Default to semantic tokens.** `bg-muted`, `text-foreground`, `border-input`, `ring-ring`. Dark mode "just works" because the variables flip.
2. **Reach for raw scales only when the design genuinely needs a specific shade.** Example: a status dot that must be exactly `bg-success-500` regardless of theme.
3. **Avoid `dark:` modifiers** unless the semantic token swap doesn't capture the intent. They re-introduce the duplication semantic tokens were designed to eliminate.
4. **Verify both modes** in Storybook before merging — the toolbar toggle covers it in seconds.

---

## Inspirations

- **shadcn/ui** — semantic token vocabulary (`primary`, `destructive`, `muted`, `foreground`, `card`, `popover`, `ring`)
- **Radix Themes** — light/dark scale flipping
- **haven `styles/haven-base.css`** — same pattern in a real consumer; eventual P7 migration drops in cleanly because vocabularies match
