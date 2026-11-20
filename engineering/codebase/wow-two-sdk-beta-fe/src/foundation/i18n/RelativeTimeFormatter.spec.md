# Relative time formatting

`formatRelativeTime(value, unit, locale, options?)` writes a signed distance in one unit ("3 days ago", "in 2 hours").
Source: [RelativeTimeFormatter.ts](RelativeTimeFormatter.ts), wording in [LocaleTables.ts](LocaleTables.ts).

Public import: `import { formatRelativeTime } from '@wow-two-beta/fe/foundation/i18n';`.

## Contract

- `value` is signed: negative is the past, positive the future, and `-0` reads as the past. `unit` is any
  `Intl.RelativeTimeFormatUnit`, singular or plural; `options` are `Intl.RelativeTimeFormatOptions`.
- Output is `Intl.RelativeTimeFormat`'s whenever the runtime has patterns for the locale. Chrome's ICU has none for
  Uzbek: `Intl` answers the root fallback, `-4 h` and `+4 h`.
- The gap is found by probing, never by version: the first format for a locale builds one
  `Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'long' })` and reads `format(-1, 'day')` and
  `format(1, 'day')`. A past that starts with a minus and a future that starts with a plus before a digit is the
  root fallback. The verdict is cached per locale in the bounded Intl cache; a locale with no SDK table is never probed.
- On the gap, a language the SDK has a table for is written from that table. Uzbek is the only one: `uz` and `uz-Latn`
  in Latin, `uz-Cyrl` in Cyrillic. `uz-Arab` and `uz-AF` have no table. Any other locale keeps `Intl`'s output, patterns
  or not.
- Script and region are read only before an extension singleton, so `uz-u-nu-cyrl` is Latin.
- Latin past: `{n} soniya | daqiqa | soat | kun | hafta | oy | chorak | yil oldin`. Future: `{n} soniyadan | daqiqadan |
  soatdan | kundan | haftadan | oydan | chorakdan | yildan keyin`. Cyrillic: the same words in Uzbek Cyrillic
  (`соат олдин`, `соатдан кейин`; `Intl`'s own Cyrillic future reads `сўнг`).
- `numeric: 'auto'` words, Latin: `hozir` (0 seconds), `shu daqiqa`, `shu soat`, `kecha` / `bugun` / `ertaga` (day
  -1, 0, 1), and `o‘tgan` / `shu` / `keyingi` before `hafta`, `oy`, `chorak`, `yil`. Cyrillic: `ҳозир`, `кеча` /
  `бугун` / `эртага`, `ўтган` / `шу` / `кейинги`. Any other count keeps its number. The apostrophe is U+2018, as in
  the SDK's other Uzbek text.
- `style` (`long`, `short`, `narrow`) does not change the table's words. The count uses the locale's number format.
- A non-finite value or a unit the table lacks goes to `Intl`, which rejects it. An invalid locale or option
  throws as `Intl` does.
- Every SDK relative-time path calls it: `LocaleFormatters.relativeTime`, `FormattedRelative` and `RelativeTime`.

## Verification

- [RelativeTimeFormatter.test.ts](../../../tests/unit/foundation/i18n/RelativeTimeFormatter.test.ts) stubs
  `Intl.RelativeTimeFormat` with the root fallback: every unit in Latin and Cyrillic, the auto words, the probe's
  cache and its limits (a language without a table, `uz-Arab`, a runtime that has Uzbek).
- [FormattedRelative.dom.test.ts](../../../tests/unit/foundation/i18n/FormattedRelative.dom.test.ts) renders
  `FormattedRelative` and `RelativeTime` under a `LocaleProvider` on that stub.
