# Localized default props

`useLocaleDefaults(props, namespace, fallbacks)` returns a readonly live prop-shaped view.
Source: [UseLocaleDefaults.ts](UseLocaleDefaults.ts).

## Contract

- Only an `undefined` property with its own fallback key resolves through `useLocale().t`.
- The translation key is `${namespace}.${key}`. The fallback remains SDK-authored text.
- Explicit empty strings, callbacks, nulls and other caller values remain unchanged.
- Fallback keys are required and exclude undefined in the returned type.
- Reads retain Vue tracking for prop changes and provider message replacements; there is no snapshot copy.
- The helper adds no DOM or global locale detection; SSR uses the same provider/default locale contract.
- Set, delete, define-property and prevent-extensions operations are rejected.
- Frozen input objects are supported; the view never mutates its source.
- Component `withDefaults` retains enum/configuration/boolean defaults. Translated string defaults move here.

## Verification

`tests/unit/foundation/i18n/LocaleDefaults.dom.test.ts` verifies live provider changes, caller overrides,
callback identity, readonly behavior, enumeration, frozen sources and compile-time output types.
