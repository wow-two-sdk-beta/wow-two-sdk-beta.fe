/** Describes how one country's national number displays and how many digits it holds. */
export interface PhoneFormat {
  /**
   * The display mask: each `X` takes one national digit, and any other character is a separator shown only once a
   * digit follows it (`XX-XXX-XX-XX` shows `99-663`, never `99-663-`).
   */
  readonly mask: string;
  /** The national significant number's digit count: the dial code and any trunk prefix excluded. */
  readonly length: number;
}

/*
 * Only fixed-length numbering plans are listed, and only where the length and the common grouping are certain. A
 * country absent here (Germany, the UK, Italy, …) has national numbers of several lengths: it displays plain
 * three-digit groups and validates against the E.164 bound alone.
 */
/** Maps an ISO 3166-1 alpha-2 code to its national-number format. */
export const PhoneFormats: Readonly<Record<string, PhoneFormat>> = Object.freeze({
  US: { mask: '(XXX) XXX-XXXX', length: 10 },
  CA: { mask: '(XXX) XXX-XXXX', length: 10 },
  AU: { mask: 'XXX XXX XXX', length: 9 },
  FR: { mask: 'X XX XX XX XX', length: 9 },
  ES: { mask: 'XXX XX XX XX', length: 9 },
  CH: { mask: 'XX XXX XX XX', length: 9 },
  NO: { mask: 'XXX XX XXX', length: 8 },
  DK: { mask: 'XX XX XX XX', length: 8 },
  PT: { mask: 'XXX XXX XXX', length: 9 },
  PL: { mask: 'XXX XXX XXX', length: 9 },
  CZ: { mask: 'XXX XXX XXX', length: 9 },
  GR: { mask: 'XXX XXX XXXX', length: 10 },
  TR: { mask: '(XXX) XXX XX XX', length: 10 },
  RU: { mask: '(XXX) XXX-XX-XX', length: 10 },
  UA: { mask: 'XX XXX XX XX', length: 9 },
  UZ: { mask: 'XX-XXX-XX-XX', length: 9 },
  KZ: { mask: '(XXX) XXX-XX-XX', length: 10 },
  KG: { mask: 'XXX XXX XXX', length: 9 },
  ZA: { mask: 'XX XXX XXXX', length: 9 },
  KE: { mask: 'XXX XXX XXX', length: 9 },
  IN: { mask: 'XXXXX XXXXX', length: 10 },
  SG: { mask: 'XXXX XXXX', length: 8 },
  HK: { mask: 'XXXX XXXX', length: 8 },
  CL: { mask: 'X XXXX XXXX', length: 9 },
  CO: { mask: 'XXX XXX XXXX', length: 10 },
  MX: { mask: 'XX XXXX XXXX', length: 10 },
});
