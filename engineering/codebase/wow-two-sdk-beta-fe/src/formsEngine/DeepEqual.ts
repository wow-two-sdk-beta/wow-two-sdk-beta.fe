import { ExactNumber } from '../foundation/numbers';

/**
 * Structural equality over form-value shapes — primitives, plain objects, arrays,
 * `ExactNumber`, `Date`, and `File` / `Blob` (upload fields). Powers dirty tracking (values vs the
 * reset baseline), so it only needs to cover what form values hold; exotic types fall
 * back to `Object.is`. (`foundation/collections` `Equality` is shallow-only, hence the local
 * deep variant.)
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return compare(a, b);
}

function compare(a: unknown, b: unknown, seen?: WeakMap<object, WeakSet<object>>): boolean {
  if (Object.is(a, b)) return true;
  if (ExactNumber.isExactNumber(a) || ExactNumber.isExactNumber(b)) {
    if (!ExactNumber.isExactNumber(a) || !ExactNumber.isExactNumber(b)) return false;
    const equal = a.equals(b);
    // A comparison outside the arithmetic resource budget stays conservatively dirty.
    return equal.ok && equal.value;
  }
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  // File metadata does not identify its bytes; immutable upload values compare by identity.
  if (typeof File !== 'undefined' && (a instanceof File || b instanceof File)) return false;
  if (typeof Blob !== 'undefined' && (a instanceof Blob || b instanceof Blob)) {
    // A bare `Blob` carries no name/lastModified — identity is the only safe signal, and
    // `Object.is` above already returned for the same ref, so distinct refs read as changed
    // (a missed dirty is worse than a spurious one for an upload field).
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const prototypeA: unknown = Object.getPrototypeOf(a);
    const prototypeB: unknown = Object.getPrototypeOf(b);
    if (
      !Array.isArray(a) &&
      ((prototypeA !== Object.prototype && prototypeA !== null) ||
        (prototypeB !== Object.prototype && prototypeB !== null))
    )
      return false;
    seen ??= new WeakMap<object, WeakSet<object>>();
    const previous = seen.get(a);
    if (previous?.has(b)) return true;
    if (previous) previous.add(b);
    else seen.set(a, new WeakSet([b]));
    const keysA = Reflect.ownKeys(a).filter((key) => Object.prototype.propertyIsEnumerable.call(a, key));
    const keysB = Reflect.ownKeys(b).filter((key) => Object.prototype.propertyIsEnumerable.call(b, key));
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        compare((a as Record<PropertyKey, unknown>)[key], (b as Record<PropertyKey, unknown>)[key], seen),
    );
  }
  return false;
}
