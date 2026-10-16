/* ---------------------------------------------------------------------------
 * OKLCH color engine — hand-rolled, zero-dependency.
 *
 * Everything the theme generator/validator needs to reason about color:
 *   - OKLCH <-> linear sRGB <-> sRGB (gamma) <-> hex
 *   - WCAG 2.1 relative luminance + contrast ratio
 *   - small gamut helpers (in-gamut check, chroma clamp)
 *
 * Color space note: OKLCH is the cylindrical form of OKLab (Björn Ottosson,
 * 2020). L ∈ [0,1] (perceptual lightness), C ≥ 0 (chroma), H ∈ [0,360) (hue°).
 * We output CSS `oklch(L C H)` strings directly for tokens, and use the sRGB
 * conversion only for contrast math (WCAG is defined on sRGB luminance).
 * ------------------------------------------------------------------------- */

/** Cylindrical OKLab color: L ∈ [0,1], C ≥ 0, H ∈ [0,360). */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** Linear-light sRGB (not gamma-encoded), each channel ∈ [0,1] (may exceed for out-of-gamut). */
interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

/** Gamma-encoded sRGB, each channel ∈ [0,1]. */
interface Srgb {
  r: number;
  g: number;
  b: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Wrap a hue into [0,360). */
export function normalizeHue(h: number): number {
  const m = h % 360;
  return m < 0 ? m + 360 : m;
}

// ---------------------------------------------------------------------------
// OKLab <-> linear sRGB  (matrices from Ottosson's reference implementation)
// ---------------------------------------------------------------------------

function oklchToLinearRgb({ l, c, h }: Oklch): LinearRgb {
  const hr = (normalizeHue(h) * Math.PI) / 180;
  const a = Math.cos(hr) * c;
  const b = Math.sin(hr) * c;

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  };
}

// ---------------------------------------------------------------------------
// linear sRGB <-> gamma sRGB  (IEC 61966-2-1)
// ---------------------------------------------------------------------------

function linearToSrgbChannel(x: number): number {
  const v = clamp01(x);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

function srgbToLinearChannel(x: number): number {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function linearRgbToSrgb(rgb: LinearRgb): Srgb {
  return {
    r: linearToSrgbChannel(rgb.r),
    g: linearToSrgbChannel(rgb.g),
    b: linearToSrgbChannel(rgb.b),
  };
}

// ---------------------------------------------------------------------------
// Gamut
// ---------------------------------------------------------------------------

/** True when the OKLCH color maps inside the sRGB gamut (no channel clipping). */
export function isInSrgbGamut(color: Oklch): boolean {
  const { r, g, b } = oklchToLinearRgb(color);
  const eps = 1e-4;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

/**
 * Reduce chroma (keeping L and H) until the color fits the sRGB gamut.
 * Binary search on chroma — cheap, deterministic, good enough for tokens.
 */
export function clampChromaToGamut(color: Oklch): Oklch {
  if (isInSrgbGamut(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (isInSrgbGamut({ l: color.l, c: mid, h: color.h })) lo = mid;
    else hi = mid;
  }
  return { l: color.l, c: lo, h: color.h };
}

// ---------------------------------------------------------------------------
// Hex
// ---------------------------------------------------------------------------

function to2Hex(v: number): string {
  return Math.round(clamp01(v) * 255)
    .toString(16)
    .padStart(2, '0');
}

/** Convert OKLCH → `#rrggbb`. Chroma is gamut-clamped first so output is always valid sRGB. */
export function oklchToHex(color: Oklch): string {
  const safe = clampChromaToGamut(color);
  const { r, g, b } = linearRgbToSrgb(oklchToLinearRgb(safe));
  return `#${to2Hex(r)}${to2Hex(g)}${to2Hex(b)}`;
}

/**
 * Format OKLCH as a CSS `oklch(L% C H)` string.
 * Rounded for compact, stable output (L→0.1%, C→4dp, H→0.1°).
 */
export function oklchToCss(color: Oklch): string {
  const safe = clampChromaToGamut(color);
  const l = (clamp01(safe.l) * 100).toFixed(1);
  const c = Math.max(0, safe.c).toFixed(4);
  const h = normalizeHue(safe.h).toFixed(1);
  return `oklch(${l}% ${c} ${h})`;
}

/** Parse `#rgb` / `#rrggbb` → gamma sRGB channels ∈ [0,1]. Returns null on malformed input. */
function parseHex(hex: string): Srgb | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h.replace(/(.)/g, '$1$1');
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// ---------------------------------------------------------------------------
// WCAG 2.1 luminance + contrast
// ---------------------------------------------------------------------------

function relativeLuminanceFromSrgb({ r, g, b }: Srgb): number {
  const R = srgbToLinearChannel(r);
  const G = srgbToLinearChannel(g);
  const B = srgbToLinearChannel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG relative luminance for an OKLCH color (via its in-gamut sRGB mapping). */
export function relativeLuminance(color: Oklch): number {
  return relativeLuminanceFromSrgb(linearRgbToSrgb(oklchToLinearRgb(clampChromaToGamut(color))));
}

function contrastFromLuminances(l1: number, l2: number): number {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 2.1 contrast ratio (1–21) between two OKLCH colors. Symmetric. */
export function contrastRatio(a: Oklch, b: Oklch): number {
  return contrastFromLuminances(relativeLuminance(a), relativeLuminance(b));
}

/** WCAG 2.1 contrast ratio between two CSS color strings. Supports `oklch(...)` and hex. */
export function contrastRatioCss(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  return contrastRatio(ca, cb);
}

/** Contrast against a translucent token composited over an opaque sRGB surface. */
export function contrastRatioCompositeCss(
  foreground: string,
  overlay: string,
  backdrop: string,
  opacity: number,
): number {
  const toRgb = (value: string): Srgb | null => {
    if (value.startsWith('#')) return parseHex(value);
    const parsed = parseColor(value);
    return parsed === null ? null : linearRgbToSrgb(oklchToLinearRgb(clampChromaToGamut(parsed)));
  };
  const fg = toRgb(foreground);
  const top = toRgb(overlay);
  const bottom = toRgb(backdrop);
  if (fg === null || top === null || bottom === null) return 1;
  const alpha = clamp01(opacity);
  const composite = {
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
  };
  return contrastFromLuminances(relativeLuminanceFromSrgb(fg), relativeLuminanceFromSrgb(composite));
}

// ---------------------------------------------------------------------------
// Parsing back from emitted token strings (for the validator)
// ---------------------------------------------------------------------------

const OklchRegex = /^oklch\(\s*([+-]?(?:\d*\.)?\d+)%?\s+([+-]?(?:\d*\.)?\d+)\s+([+-]?(?:\d*\.)?\d+)\s*\)$/i;

/** Parse a token color string (`oklch(L% C H)` or hex) back into OKLCH. Returns null if unparseable. */
export function parseColor(value: string): Oklch | null {
  const v = value.trim();
  const m = OklchRegex.exec(v);
  if (m && m[1] && m[2] && m[3]) {
    const lRaw = parseFloat(m[1]);
    // L written as a percent (e.g. `62.5%`) or a 0–1 number.
    const l = v.includes('%') ? lRaw / 100 : lRaw;
    const c = Number(m[2]);
    const h = Number(m[3]);
    if (![l, c, h].every(Number.isFinite) || l < 0 || l > 1 || c < 0) return null;
    return { l, c, h: normalizeHue(h) };
  }
  if (v.startsWith('#')) {
    const srgb = parseHex(v);
    if (!srgb) return null;
    return srgbToOklch(srgb);
  }
  return null;
}

function srgbToOklch(srgb: Srgb): Oklch {
  const r = srgbToLinearChannel(srgb.r);
  const g = srgbToLinearChannel(srgb.g);
  const b = srgbToLinearChannel(srgb.b);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.hypot(a, bb);
  const h = normalizeHue((Math.atan2(bb, a) * 180) / Math.PI);
  return { l: L, c, h };
}

/** Grouped namespace export (mirrors `ColorExtensions` style elsewhere in the lib). */
export const Oklch = {
  normalizeHue,
  isInSrgbGamut,
  clampChromaToGamut,
  oklchToHex,
  oklchToCss,
  parseColor,
  relativeLuminance,
  contrastRatio,
  contrastRatioCss,
} as const;
