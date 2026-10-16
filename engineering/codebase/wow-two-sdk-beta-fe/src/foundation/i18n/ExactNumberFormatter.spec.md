# Exact number formatting

Public functions: `formatExactNumber`, `formatExactCurrency`, `formatExactPercent`.
The locale-bound facade exposes `exactNumber`, `exactCurrency`, and `exactPercent`.

## Contract

- Every function accepts an SDK `ExactNumber` and returns `Result<string, NumberFailure>`.
- Default formatting preserves every retained decimal digit. It never approximates through native `number`.
- Currency formatting pads to the currency's minor-unit minimum but does not silently round excess digits.
- Percent formatting scales the exact value by 100 before display rounding.
- `maximumFractionDigits` explicitly requests rounding; the default mode is `NumberRounding.HalfEven`.
- `minimumFractionDigits` pads zeros. If omitted, an explicit smaller maximum also lowers the default minimum.
- `Intl.NumberFormat` owns grouping, digits, decimal marks, currency/percent placement, signs and bidi literals.
- Currency display supports `symbol`, `code`, and `narrowSymbol`; `currencySign` supports `standard`/`accounting`.
- Currency-name pluralization and scientific/compact notation are outside this surface.
- Negative values rounded to zero retain a negative display sign unless `signDisplay` suppresses it.
- Magnitudes beyond binary64 and fractions beyond the runtime's Intl precision are supported within display work budgets.
- Locale formatter instances and digit metadata share the existing bounded Intl cache.

## Failures

- Expansion exceeding `NumberLimits.maxArithmeticPlaces` returns `ResourceLimit`.
- Digit options use the existing `maxDecimalPlaces` allocation budget; no backend scalar range is inferred.
- Invalid locale/options/structural input are programmer errors. Expected arithmetic/resource failures return Result.

## Verification

`tests/unit/foundation/i18n/ExactNumberFormatter.test.ts` covers exact Int64/decimal values,
USD/JPY/KWD minor units, German currency placement, accounting signs, Arabic bidi parity,
Turkish percent placement, exact scaling/rounding, large exponents, long fractions and cached reuse.
