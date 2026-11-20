import { memoIntl } from './IntlCache';

/** Lists every officially assigned ISO 3166-1 alpha-2 region code, uppercase, in alphabetical order. */
export const RegionCodes: ReadonlyArray<string> = Object.freeze(
  (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ ' +
    'BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
    'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
    'DE DJ DK DM DO DZ ' +
    'EC EE EG EH ER ES ET ' +
    'FI FJ FK FM FO FR ' +
    'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY ' +
    'HK HM HN HR HT HU ' +
    'ID IE IL IM IN IO IQ IR IS IT ' +
    'JE JM JO JP ' +
    'KE KG KH KI KM KN KP KR KW KY KZ ' +
    'LA LB LC LI LK LR LS LT LU LV LY ' +
    'MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
    'NA NC NE NF NG NI NL NO NP NR NU NZ ' +
    'OM ' +
    'PA PE PF PG PH PK PL PM PN PR PS PT PW PY ' +
    'QA ' +
    'RE RO RS RU RW ' +
    'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
    'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
    'UA UG UM US UY UZ ' +
    'VA VC VE VG VI VN VU ' +
    'WF WS ' +
    'YE YT ' +
    'ZA ZM ZW'
  ).split(' '),
);

const KnownCodes: ReadonlySet<string> = new Set(RegionCodes);

/** Reports whether a value is an officially assigned ISO 3166-1 alpha-2 code, written in uppercase. */
export function isRegionCode(value: unknown): value is string {
  return typeof value === 'string' && KnownCodes.has(value);
}

/** The region name in one locale, or `undefined` when the runtime has none or rejects the locale. */
function displayNameIn(code: string, locale: string): string | undefined {
  try {
    const names = memoIntl(`dn|${locale}`, () => new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' }));
    return names.of(code) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Returns a region's name in a locale (`Oʻzbekiston`), falling back to its English name, then to the code itself. */
export function regionName(code: string, locale?: string): string {
  return (locale ? displayNameIn(code, locale) : undefined) ?? displayNameIn(code, 'en') ?? code;
}

/** Returns a region's flag emoji — its letters as regional indicator symbols. Empty unless two letters. */
export function regionFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
}
