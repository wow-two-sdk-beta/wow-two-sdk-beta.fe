import { ExactNumber } from '../foundation/numbers';

/**
 * Detaches supported mutable editing containers without serializing platform values.
 * Plain objects, arrays and Date are copied; ExactNumber, File/Blob, Temporal and custom class
 * instances are opaque immutable leaves and retain identity. Replace those leaves
 * through a form setter instead of mutating their internals. Editing trees are acyclic.
 */
export function snapshotFormValues<T>(value: T): T {
  const copies = new WeakMap<object, unknown>();
  const copy = (current: unknown): unknown => {
    if (current === null || typeof current !== 'object' || ExactNumber.isExactNumber(current)) return current;
    const existing = copies.get(current);
    if (existing !== undefined) return existing;
    if (current instanceof Date) {
      const result = new Date(current.getTime());
      copies.set(current, result);
      return result;
    }
    if (Array.isArray(current)) {
      const result: unknown[] = new Array(current.length);
      copies.set(current, result);
      current.forEach((item, index) => {
        result[index] = copy(item);
      });
      return result;
    }
    const prototype: unknown = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) return current;
    const result = Object.create(prototype) as Record<PropertyKey, unknown>;
    copies.set(current, result);
    for (const key of Reflect.ownKeys(current)) {
      if (!Object.prototype.propertyIsEnumerable.call(current, key)) continue;
      Object.defineProperty(result, key, {
        value: copy((current as Record<PropertyKey, unknown>)[key]),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return result;
  };
  return copy(value) as T;
}
