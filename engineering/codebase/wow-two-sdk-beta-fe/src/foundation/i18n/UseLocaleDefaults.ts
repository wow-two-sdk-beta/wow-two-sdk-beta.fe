import { useLocale } from './providers/LocaleContext';

export type LocaleDefaultProps<TProps extends object, TFallbacks> = Readonly<
  Omit<TProps, keyof TFallbacks> & {
    [K in keyof TFallbacks]-?: K extends keyof TProps ? Exclude<TProps[K], undefined> : never;
  }
>;

/** A readonly live prop view; only omitted authored text resolves through the nearest locale provider. */
export function useLocaleDefaults<
  TProps extends object,
  const TFallbacks extends Partial<Record<keyof TProps, string>>,
>(
  props: TProps,
  namespace: string,
  fallbacks: TFallbacks & Record<Exclude<keyof TFallbacks, keyof TProps>, never>,
): LocaleDefaultProps<TProps, TFallbacks> {
  const locale = useLocale();
  const read = (key: PropertyKey): unknown => {
    const value = Reflect.get(props, key);
    if (value !== undefined || typeof key !== 'string' || !Object.hasOwn(fallbacks, key)) return value;
    return locale.t(`${namespace}.${key}`, undefined, Reflect.get(fallbacks, key) as string);
  };
  return new Proxy(
    {},
    {
      get: (_target, key) => read(key),
      has: (_target, key) => Object.hasOwn(props, key) || Object.hasOwn(fallbacks, key),
      ownKeys: () => [...new Set([...Reflect.ownKeys(props), ...Reflect.ownKeys(fallbacks)])],
      getOwnPropertyDescriptor: (_target, key) =>
        Object.hasOwn(props, key) || Object.hasOwn(fallbacks, key)
          ? { configurable: true, enumerable: true, value: read(key), writable: false }
          : undefined,
      set: () => false,
      defineProperty: () => false,
      deleteProperty: () => false,
      preventExtensions: () => false,
    },
  ) as LocaleDefaultProps<TProps, TFallbacks>;
}
