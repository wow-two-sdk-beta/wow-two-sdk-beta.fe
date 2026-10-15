export * from './providers/LocaleContext';
export * from './LocaleFormatters';
export * from './ExactNumberFormatter';
export { toRelativeTimeParts, toEpochMs, type RelativeTimeParts } from './RelativeTimeParts';

// `LocaleProvider` and `FormattedRelative` are SFCs, so they need a named re-export rather than a `export *`
// (a `.vue` module's only meaningful export is its default). The provide/inject half of `LocaleProvider` lives
// in `LocaleContext.ts` as `provideLocale`, so a component that owns a locale needs no wrapper element.
export { default as LocaleProvider, type LocaleProviderProps } from './providers/LocaleProvider.vue';
export { FormattedRelative, type FormattedRelativeProps } from './formattedRelative';

export { createCollator, compareStrings } from './Compare';
export { useLocaleDefaults, type LocaleDefaultProps } from './UseLocaleDefaults';
