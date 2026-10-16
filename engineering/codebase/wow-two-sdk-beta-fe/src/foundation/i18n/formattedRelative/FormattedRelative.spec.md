# FormattedRelative

Source: [FormattedRelative.vue](FormattedRelative.vue). Exported from `foundation/i18n`.

Required `value: number` is the signed relative-time magnitude; required `unit: Intl.RelativeTimeFormatUnit` selects its unit. Optional `options: Intl.RelativeTimeFormatOptions` configures Intl formatting. The default output is a text node, with no wrapper element or interactive semantics. `FormattedRelativeProps` remains public.

Formatting follows the nearest locale context and reacts to locale and prop changes. The provider-free locale is the context's deterministic fallback. This component does not read the clock, schedule refreshes or calculate a relative magnitude from a timestamp; callers own those decisions. It delegates invalid magnitude/unit/option handling to Intl and does not transform input types.

Source and SFC compilation verify this relocation. Locale context behavior is covered separately by `tests/unit/foundation/i18n/LocaleProvider.dom.test.ts`; that suite does not claim an exhaustive component prop matrix.
