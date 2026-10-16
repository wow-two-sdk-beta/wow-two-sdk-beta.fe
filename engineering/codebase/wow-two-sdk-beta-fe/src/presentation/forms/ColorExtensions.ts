// Color parsing + conversion helpers for ColorPicker, ColorArea, ColorWheelInput,
// ColorSliderInput, ColorSwatchPreview, ColorInput. Co-located in `forms/` so imports
// stay within-domain.
//
// Canonical representation: HSV (hue 0–360, saturation 0–1, value 0–1) plus
// alpha 0–1. HSV picks the cleanest geometry for picker UIs (saturation/value
// square, hue ring). External interface is hex strings (#RRGGBB or #RRGGBBAA).

export interface RGB {
  r: number; // 0–255
  g: number; // 0–255
  b: number; // 0–255
  a?: number; // 0–1 (default 1)
}

export interface HSV {
  h: number; // 0–360
  s: number; // 0–1
  v: number; // 0–1
  a?: number; // 0–1
}

export interface HSL {
  h: number; // 0–360
  s: number; // 0–1
  l: number; // 0–1
  a?: number; // 0–1
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function clampHue(h: number): number {
  let v = h % 360;
  if (v < 0) v += 360;
  return v;
}

export function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// ───────── hex ↔ rgb ─────────

/** Parse "#RGB", "#RGBA", "#RRGGBB", or "#RRGGBBAA". Returns null on invalid. */
export function parseHex(input: string | null | undefined): RGB | null {
  if (!input) return null;
  const s = input.trim().replace(/^#/, '');
  let m: string | null = null;
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    m = s
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (/^[0-9a-fA-F]{4}$/.test(s)) {
    m = s
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (/^[0-9a-fA-F]{6}$/.test(s) || /^[0-9a-fA-F]{8}$/.test(s)) {
    m = s;
  }
  if (!m) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const a = m.length === 8 ? parseInt(m.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/** Format RGB → "#RRGGBB" (or "#RRGGBBAA" if alpha < 1). */
export function formatHex(rgb: RGB | null | undefined, options?: { withAlpha?: boolean }): string {
  if (!rgb) return '';
  const r = clampByte(rgb.r).toString(16).padStart(2, '0');
  const g = clampByte(rgb.g).toString(16).padStart(2, '0');
  const b = clampByte(rgb.b).toString(16).padStart(2, '0');
  const includeAlpha = options?.withAlpha ?? (rgb.a !== undefined && rgb.a < 1);
  if (includeAlpha) {
    const a = clampByte((rgb.a ?? 1) * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }
  return `#${r}${g}${b}`;
}

// ───────── rgb ↔ hsv ─────────

export function rgbToHsv({ r, g, b, a = 1 }: RGB): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v, a };
}

export function hsvToRgb({ h, s, v, a = 1 }: HSV): RGB {
  const c = v * s;
  const hh = clampHue(h) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh >= 0 && hh < 1) [r1, g1, b1] = [c, x, 0];
  else if (hh < 2) [r1, g1, b1] = [x, c, 0];
  else if (hh < 3) [r1, g1, b1] = [0, c, x];
  else if (hh < 4) [r1, g1, b1] = [0, x, c];
  else if (hh < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = v - c;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
    a,
  };
}

// ───────── rgb ↔ hsl ─────────

export function rgbToHsl({ r, g, b, a = 1 }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l, a };
}

export function hslToRgb({ h, s, l, a = 1 }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = clampHue(h) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh >= 0 && hh < 1) [r1, g1, b1] = [c, x, 0];
  else if (hh < 2) [r1, g1, b1] = [x, c, 0];
  else if (hh < 3) [r1, g1, b1] = [0, c, x];
  else if (hh < 4) [r1, g1, b1] = [0, x, c];
  else if (hh < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
    a,
  };
}

// ───────── hex ↔ hsv (most-used composite) ─────────

export function parseColorToHsv(input: string | null | undefined): HSV | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  return rgbToHsv(rgb);
}

export function hsvToHex(hsv: HSV, options?: { withAlpha?: boolean }): string {
  return formatHex(hsvToRgb(hsv), options);
}

// ───────── format helpers ─────────

export function formatRgbString({ r, g, b, a = 1 }: RGB): string {
  if (a < 1) return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${a.toFixed(2)})`;
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`;
}

export function formatHslString({ h, s, l, a = 1 }: HSL): string {
  const hh = Math.round(clampHue(h));
  const ss = Math.round(s * 100);
  const ll = Math.round(l * 100);
  if (a < 1) return `hsla(${hh}, ${ss}%, ${ll}%, ${a.toFixed(2)})`;
  return `hsl(${hh}, ${ss}%, ${ll}%)`;
}
