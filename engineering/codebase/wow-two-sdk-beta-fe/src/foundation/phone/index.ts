// phone — foundation seam. The dialling countries, the national-number format table (display mask + digit count per
// fixed-length plan) and the E.164 helpers the phone control and the `phone()` validator share: country lookup by
// dial prefix, length rules, mask display and caret-stable editing. No Vue, no `libphonenumber`: a country absent
// from `PhoneFormats` displays three-digit groups and validates against the E.164 bound alone.

export { type PhoneCountry, PhoneCountries } from './PhoneCountries';
export { type PhoneFormat, PhoneFormats } from './PhoneFormats';
export {
  type PhoneNumberParts,
  type PhoneLengthRange,
  type PhoneNationalEditInput,
  type PhoneNationalEdit,
  type PhoneInternationalNumber,
  PhoneNumberExtensions,
} from './PhoneNumberExtensions';
