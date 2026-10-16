import {
  computed,
  inject,
  provide,
  toValue,
  unref,
  type ComputedRef,
  type InjectionKey,
  type MaybeRef,
  type MaybeRefOrGetter,
} from 'vue';

/** Interpolation variables for a message template (`Hello {name}` + `{ name: 'Sam' }`). */
export type MessageVars = Record<string, string | number>;

/** A message resolver — a `key → template` dictionary, or a `(key, vars) => string` callback (bring-your-own ICU). */
export type Messages = Record<string, string> | ((key: string, vars?: MessageVars) => string);

/** Replaces `{token}` placeholders from `vars`; leaves unknown tokens untouched. */
export function interpolate(template: string, vars?: MessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    Object.hasOwn(vars, token) ? String(vars[token]) : match,
  );
}

/** Resolves a message: consumer `messages` override (dict or callback) → SDK-authored `fallback` → the raw key. */
export function resolveMessage(
  messages: Messages | undefined,
  key: string,
  vars?: MessageVars,
  fallback?: string,
): string {
  if (typeof messages === 'function') return messages(key, vars);
  const template = messages && Object.hasOwn(messages, key) ? messages[key] : undefined;
  return interpolate(template ?? fallback ?? key, vars);
}

/**
 * The active locale + message resolver exposed by `useLocale`.
 *
 * `locale` is a `ComputedRef` rather than a bare string — Vue's `provide` is not reactive on its own, and a
 * consumer switching locales must re-evaluate every descendant. `t` stays a plain function: it reads the
 * provider's messages at CALL time, so invoking it inside a `computed` tracks a message-table swap without
 * `t` itself ever changing identity.
 */
export interface LocaleContextValue {
  /** The active BCP-47 locale (e.g. `en-US`, `de`). */
  locale: ComputedRef<string>;
  /** Resolves a message key — consumer override, else the SDK-authored `fallback`, else the key. */
  t: (key: string, vars?: MessageVars, fallback?: string) => string;
}

const DefaultLocale = 'en-US';

/** Identifies the locale owned by the nearest provider. */
export const LocaleKey: InjectionKey<LocaleContextValue> = Symbol('wow-two.locale');

/**
 * The provider half — used by `LocaleProvider`, and by any component that owns a locale.
 *
 * The deterministic fallback matches server and initial client rendering. Applications can pass the same
 * request locale to both, or explicitly switch to browser preferences after hydration.
 * Message callbacks are values; wrap a reactive message source in a ref or computed.
 */
export function provideLocale(
  locale?: MaybeRefOrGetter<string | undefined>,
  messages?: MaybeRef<Messages | undefined>,
): LocaleContextValue {
  const value: LocaleContextValue = {
    locale: computed(() => toValue(locale) ?? DefaultLocale),
    t: (key, vars, fallback) => resolveMessage(unref(messages), key, vars, fallback),
  };
  provide(LocaleKey, value);
  return value;
}

/** Reads the active locale + `t`. Works without a provider — defaults to `en-US` + fallback-only messages. */
export function useLocale(): LocaleContextValue {
  return inject(
    LocaleKey,
    () => ({
      locale: computed(() => DefaultLocale),
      t: (key: string, vars?: MessageVars, fallback?: string) => interpolate(fallback ?? key, vars),
    }),
    true,
  );
}
