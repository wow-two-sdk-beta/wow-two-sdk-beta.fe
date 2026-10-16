/** Bounds retained formatter instances without restricting supported locales or options. */
const CacheCapacity = 256;
const instances = new Map<string, unknown>();

/** Reuses recently used Intl instances and evicts only cache entries. */
export function memoIntl<T>(key: string, create: () => T): T {
  if (instances.has(key)) {
    const instance = instances.get(key) as T;
    instances.delete(key);
    instances.set(key, instance);
    return instance;
  }
  const instance = create();
  if (instances.size >= CacheCapacity) {
    const oldest = instances.keys().next().value;
    if (oldest !== undefined) instances.delete(oldest);
  }
  instances.set(key, instance);
  return instance;
}

/** Equivalent option objects share a cache entry regardless of insertion order. */
export function intlOptionsKey(options: object | undefined): string {
  return options
    ? JSON.stringify(Object.fromEntries(Object.entries(options).sort(([left], [right]) => left.localeCompare(right))))
    : '';
}
