// File-name parsing — extension and base-name extraction, plus safe-name sanitizing for a download. Pure string
// work, deliberately separate from the DOM helpers so it stays node-testable.

/**
 * Returns the lower-cased extension of a file name, without the leading dot. Yields `''` when there is no
 * extension, when the name is a dotfile (`.gitignore` — the dot starts the name, it doesn't separate one), or
 * when the dot is trailing.
 */
export function fileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/** Returns the file name without its extension (`report.final.pdf` → `report.final`). Dotfiles are returned whole. */
export function fileBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return filename;
  return filename.slice(0, lastDot);
}

/** Tunes download-name sanitizing. */
export interface SafeFileNameOptions {
  /** The character replacing each illegal run. Defaults to `-`. */
  readonly replacement?: string;

  /** Maximum length of the result (extension preserved when truncating). Defaults to `255`. */
  readonly maxLength?: number;
}

/**
 * Control characters (C0 range plus DEL) — built from escape sequences rather than a regex literal so no literal
 * control byte ever appears in this source file.
 */
// eslint-disable-next-line no-control-regex -- stripping control chars is the point of this pattern
const ControlCharacters = new RegExp('[\\u0000-\\u001f\\u007f]', 'g');

/** Path separators + the characters Windows reserves in a file name. */
const ReservedCharacters = /[/\\<>:"|?*]+/g;

/**
 * Sanitizes a string into a file name safe across Windows / macOS / Linux: strips path separators, the reserved
 * characters `< > : " | ? *`, and control characters; collapses whitespace; trims leading/trailing dots and
 * spaces. Truncates to `maxLength` while preserving the extension. Returns `'file'` when nothing usable remains.
 */
export function safeFileName(name: string, options?: SafeFileNameOptions): string {
  const replacement = (options?.replacement ?? '-').replace(ControlCharacters, '').replace(ReservedCharacters, '-');
  const requestedLength = options?.maxLength ?? 255;
  const maxLength = Number.isFinite(requestedLength) ? Math.max(1, Math.trunc(requestedLength)) : 255;

  const cleaned = name
    .replace(ControlCharacters, '')
    .replace(ReservedCharacters, () => replacement)
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();

  if (cleaned === '') return 'file'.slice(0, maxLength);
  if (cleaned.length <= maxLength) return cleaned;

  // Truncate the base, keep the extension so the file still opens with the right handler.
  const extension = fileExtension(cleaned);
  if (extension === '') return cleaned.slice(0, maxLength).replace(/[.\s]+$/g, '') || 'file'.slice(0, maxLength);

  const suffix = `.${extension}`;
  if (suffix.length >= maxLength)
    return cleaned.slice(0, maxLength).replace(/[.\s]+$/g, '') || 'file'.slice(0, maxLength);
  const headLength = maxLength - suffix.length;
  return fileBaseName(cleaned).slice(0, headLength) + suffix;
}
