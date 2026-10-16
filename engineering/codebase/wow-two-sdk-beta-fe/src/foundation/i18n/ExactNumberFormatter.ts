import { ExactNumber, NumberFailureCode, NumberLimits, NumberRounding, type NumberFailure } from '../numbers';
import { ResultExtensions, type Result } from '../results';
import { intlOptionsKey, memoIntl } from './IntlCache';

export interface ExactNumberFormatOptions {
  readonly style?: 'decimal' | 'currency' | 'percent';
  /** Required for currency style; its minor units supply the default minimum fraction digits. */
  readonly currency?: string;
  readonly currencyDisplay?: 'symbol' | 'code' | 'narrowSymbol';
  readonly currencySign?: 'standard' | 'accounting';
  readonly useGrouping?: boolean;
  readonly minimumFractionDigits?: number;
  /** Rounding occurs only when this display precision is explicitly supplied. */
  readonly maximumFractionDigits?: number;
  readonly rounding?: NumberRounding;
  readonly signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
}
export type ExactCurrencyFormatOptions = Omit<ExactNumberFormatOptions, 'style' | 'currency'>;
export type ExactPercentFormatOptions = Omit<
  ExactNumberFormatOptions,
  'style' | 'currency' | 'currencyDisplay' | 'currencySign'
>;

interface DecimalText {
  readonly integer: string;
  readonly fraction: string;
}
interface LocaleDigits {
  readonly digits: ReadonlyArray<string>;
  readonly decimal: string;
}

const NumericToken = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

function resourceFailure(): Result<never, NumberFailure> {
  return ResultExtensions.fail({
    code: NumberFailureCode.ResourceLimit,
    message: 'The formatted decimal exceeds the exact-number display budget.',
  });
}

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  return memoIntl(`n|${locale}|${intlOptionsKey(options)}`, () => new Intl.NumberFormat(locale, options));
}

/** Expands a bounded exact token without converting any digit through binary64. */
function expand(value: ExactNumber): Result<DecimalText, NumberFailure> {
  const match = NumericToken.exec(value.toString());
  if (!match) throw new Error('Exact number token invariant failed.');
  const coefficient = match[2]! + (match[3] ?? '');
  const decimalIndex = BigInt(match[2]!.length) + BigInt(match[4] ?? '0');
  const budget = BigInt(NumberLimits.maxArithmeticPlaces);
  if (decimalIndex > budget || decimalIndex < -budget) return resourceFailure();
  const index = Number(decimalIndex);
  const integer = index <= 0 ? '0' : coefficient.slice(0, index).padEnd(index, '0');
  const fraction = index <= 0 ? '0'.repeat(-index) + coefficient : coefficient.slice(index);
  if (integer.length + fraction.length > NumberLimits.maxArithmeticPlaces) return resourceFailure();
  return ResultExtensions.ok({ integer, fraction });
}

/** Percent scales the numeric token before display rounding, without arithmetic-engine expansion. */
function percentValue(value: ExactNumber): Result<ExactNumber, NumberFailure> {
  const match = NumericToken.exec(value.toString());
  if (!match) throw new Error('Exact number token invariant failed.');
  return ExactNumber.parse(
    `${match[1]}${match[2]}${match[3] === undefined ? '' : '.' + match[3]}e${BigInt(match[4] ?? '0') + 2n}`,
  );
}

function localeDigits(locale: string): LocaleDigits {
  return memoIntl(`exact-digits|${locale}`, () => {
    const formatter = numberFormat(locale, { useGrouping: false });
    return {
      digits: Array.from({ length: 10 }, (_, digit) =>
        formatter
          .formatToParts(digit)
          .filter((part) => part.type === 'integer')
          .map((part) => part.value)
          .join(''),
      ),
      decimal: formatter.formatToParts(1.1).find((part) => part.type === 'decimal')!.value,
    };
  });
}

function localizeDigits(value: string, digits: ReadonlyArray<string>): string {
  return [...value].map((digit) => digits[Number(digit)]!).join('');
}

function assertDigitOption(name: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > NumberLimits.maxDecimalPlaces))
    throw new RangeError(`${name} must be an integer from 0 to ${NumberLimits.maxDecimalPlaces}.`);
}

/** Formats exact decimal, money and percent values; only an explicit maximum requests rounding. */
export function formatExactNumber(
  value: ExactNumber,
  locale: string,
  options: ExactNumberFormatOptions = {},
): Result<string, NumberFailure> {
  if (!ExactNumber.isExactNumber(value)) throw new TypeError('Expected an SDK ExactNumber.');
  assertDigitOption('minimumFractionDigits', options.minimumFractionDigits);
  assertDigitOption('maximumFractionDigits', options.maximumFractionDigits);
  if (
    options.minimumFractionDigits !== undefined &&
    options.maximumFractionDigits !== undefined &&
    options.minimumFractionDigits > options.maximumFractionDigits
  )
    throw new RangeError('minimumFractionDigits cannot exceed maximumFractionDigits.');
  if (options.currencyDisplay !== undefined && !['symbol', 'code', 'narrowSymbol'].includes(options.currencyDisplay))
    throw new RangeError('Exact currency display supports symbol, code or narrowSymbol.');

  const style = options.style ?? 'decimal';
  const displayOptions: Intl.NumberFormatOptions = {
    style,
    ...(style === 'currency'
      ? { currency: options.currency, currencyDisplay: options.currencyDisplay, currencySign: options.currencySign }
      : {}),
  };
  const defaults = numberFormat(locale, displayOptions).resolvedOptions();
  const minimumFractionDigits =
    options.minimumFractionDigits ??
    Math.min(defaults.minimumFractionDigits ?? 0, options.maximumFractionDigits ?? Infinity);
  const scaled = style === 'percent' ? percentValue(value) : ResultExtensions.ok(value);
  if (!scaled.ok) return scaled;
  const rounded =
    options.maximumFractionDigits === undefined
      ? scaled
      : scaled.value.round({
          decimalPlaces: options.maximumFractionDigits,
          rounding: options.rounding ?? NumberRounding.HalfEven,
        });
  if (!rounded.ok) return rounded;
  const expanded = expand(rounded.value);
  if (!expanded.ok) return expanded;
  const fraction = expanded.value.fraction.padEnd(minimumFractionDigits, '0');
  if (expanded.value.integer.length + fraction.length > NumberLimits.maxArithmeticPlaces) return resourceFailure();
  const integer = numberFormat(locale, { useGrouping: options.useGrouping ?? true }).format(
    BigInt(expanded.value.integer),
  );
  const digits = localeDigits(locale);
  const numeric = integer + (fraction === '' ? '' : digits.decimal + localizeDigits(fraction, digits.digits));
  // Intl owns prefix/suffix ordering, accounting parentheses, percent symbols and bidi literals.
  const sign = value.toString().startsWith('-') ? -1 : 1;
  const sample = sign * (rounded.value.isZero() ? 0 : 1);
  const parts = numberFormat(locale, {
    ...displayOptions,
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    signDisplay: options.signDisplay ?? 'auto',
  }).formatToParts(sample);
  let inserted = false;
  return ResultExtensions.ok(
    parts
      .map((part) => {
        if (['integer', 'group', 'decimal', 'fraction'].includes(part.type)) {
          if (inserted) return '';
          inserted = true;
          return numeric;
        }
        return part.value;
      })
      .join(''),
  );
}

/** Formats exact money without implicitly rounding to the currency's minor unit. */
export function formatExactCurrency(
  value: ExactNumber,
  locale: string,
  currency: string,
  options: ExactCurrencyFormatOptions = {},
): Result<string, NumberFailure> {
  return formatExactNumber(value, locale, { ...options, style: 'currency', currency });
}

/** Scales an exact ratio by 100 before applying the caller's optional display precision. */
export function formatExactPercent(
  value: ExactNumber,
  locale: string,
  options: ExactPercentFormatOptions = {},
): Result<string, NumberFailure> {
  return formatExactNumber(value, locale, { ...options, style: 'percent' });
}
