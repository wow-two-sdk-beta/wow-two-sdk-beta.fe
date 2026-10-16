// Byte-size humanizing — the non-locale formatting `Intl` doesn't cover. `formatBytes(1536)` → `1.5 KB`.
// Decimal (SI, 1000) by default; binary (IEC, 1024 → KiB/MiB) opt-in. Pure and locale-free — pair it with the
// i18n number formatter only if a localized decimal separator is needed (this uses a plain `.`).

/** Tunes byte formatting. */
export interface FormatBytesOptions {
  /** Use 1024-based IEC units (`KiB`/`MiB`) instead of 1000-based SI units (`KB`/`MB`). Defaults to `false`. */
  readonly binary?: boolean;

  /** Maximum fraction digits for units above bytes (trailing zeros are trimmed). Defaults to `1`. */
  readonly decimals?: number;

  /** Insert a space between the number and the unit. Defaults to `true`. */
  readonly space?: boolean;
}

const SiUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const;
const IecUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] as const;

/**
 * Formats a byte count as a human-readable size. Chooses the largest unit whose value is ≥ 1, rounds to
 * `decimals` fraction digits (trailing zeros trimmed; whole bytes never show decimals), and preserves sign.
 * Throws a `RangeError` on a non-finite input — formatting `NaN`/`Infinity` bytes is a caller bug.
 */
export function formatBytes(bytes: number, options?: FormatBytesOptions): string {
  if (!Number.isFinite(bytes)) throw new RangeError(`formatBytes: expected a finite number, got ${bytes}`);

  const base = options?.binary === true ? 1024 : 1000;
  const units = options?.binary === true ? IecUnits : SiUnits;
  const decimals = options?.decimals ?? 1;
  const separator = options?.space === false ? '' : ' ';

  const sign = bytes < 0 ? '-' : '';
  const abs = Math.abs(bytes);

  if (abs < 1) return `${sign}${abs}${separator}B`;

  // Largest unit index whose magnitude fits, clamped to the table.
  const exponent = Math.min(Math.floor(Math.log(abs) / Math.log(base)), units.length - 1);
  const value = abs / base ** exponent;
  const digits = exponent === 0 ? 0 : decimals;
  // `Number(toFixed())` rounds to `digits` then drops trailing zeros (`1.0` → `1`).
  const rounded = Number(value.toFixed(digits));

  return `${sign}${rounded}${separator}${units[exponent]}`;
}
