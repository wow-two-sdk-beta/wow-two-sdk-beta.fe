# Date names

Month and weekday names and the month-and-year title. Source: [DateNames.ts](DateNames.ts), Uzbek names in
[LocaleTables.ts](LocaleTables.ts).

Public import: `import { monthName, weekdayName, formatMonthYear } from '@wow-two-beta/fe/foundation/i18n';`.
The locale-bound facade offers them as `monthName(month, style?)`, `weekdayName(isoDay, style?)` and
`monthYear(value)`.

## Contract

- `monthName(month, locale, style = 'long')`: `month` is 1-12, January first.
  `weekdayName(isoDay, locale, style = 'long')`: `isoDay` is the ISO 8601 number, Monday 1 to Sunday 7.
  `style` is `long`, `short` or `narrow`. A number outside the range throws a `RangeError`.
- `formatMonthYear(value, locale)` takes a `Temporal.PlainDate`, a `Temporal.PlainYearMonth` or any `{ year, month }`
  and writes `November 2026` in `en`, `ноябрь 2026 г.` in `ru`, `noyabr 2026` in `uz` and `ноябр 2026` in `uz-Cyrl`.
- Names come from `Intl.DateTimeFormat`, pinned to UTC so no time zone shifts the day, and are cached.
- Chrome's ICU has no Uzbek month or weekday names: it writes the root `M11` for a month and English for a weekday.
  The gap is probed, never hard-coded: a November (long and short) that reads as `M11`, a bare number or the English
  name, and a Wednesday (long and short) that reads as the English name. Months and weekdays are probed apart, once
  per locale, and only for a locale the SDK has a table for. Elsewhere `Intl` answers, whatever it writes.
- On the gap `uz` and `uz-Latn` read the Latin table and `uz-Cyrl` the Cyrillic one (`uz-Arab` and `uz-AF` have none):
  - months long `yanvar … dekabr`, short `yan fev mar apr may iyn iyl avg sen okt noy dek`;
  - weekdays long `dushanba seshanba chorshanba payshanba juma shanba yakshanba`, short `Du Se Ch Pa Ju Sh Ya`;
  - Cyrillic months `январ … декабр`, short `янв … дек`; weekdays `душанба … якшанба`, short `Ду Се Чо Па Жу Ша Як`;
  - `narrow` is the first letter of the long name, capitalised: `D S C P J S Y`, `Y F M A M I I A S O N D`.
- Table names keep the case the table writes; the caller capitalises them for a title or a header.

## Verification

- [DateNames.test.ts](../../../tests/unit/foundation/i18n/DateNames.test.ts) covers `en` and `ru` through `Intl`, the
  range errors, and `uz` / `uz-Cyrl` on a stub of `Intl.DateTimeFormat` that answers `M11` and English: all names in
  every style, the month-and-year title, separate month and weekday probes, and the probe's cache.
