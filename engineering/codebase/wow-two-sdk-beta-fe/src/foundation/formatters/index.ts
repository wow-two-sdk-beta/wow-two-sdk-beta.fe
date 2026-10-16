// format — foundation seam. Pure, locale-free humanizers that `Intl` doesn't cover: `formatBytes` (SI/IEC
// sizes), `formatDuration` (compact elapsed time), text helpers (`truncate`/`capitalize`/`titleCase`/`slugify`/
// `initials`/`maskString`), and English count helpers (`pluralize`/`ordinal`). For locale-aware number/currency/
// date/relative formatting use the i18n formatters (`foundation/i18n`) instead — this slice is the terse,
// language-neutral (or explicitly-English) layer.

export { formatBytes, type FormatBytesOptions } from './Bytes';
export { formatDuration, type FormatDurationOptions } from './Duration';
export {
  truncate,
  capitalize,
  titleCase,
  slugify,
  initials,
  maskString,
  type TruncateOptions,
  type SlugifyOptions,
  type InitialsOptions,
  type MaskOptions,
} from './Text';
export { pluralize, ordinal, ordinalSuffix } from './Count';
