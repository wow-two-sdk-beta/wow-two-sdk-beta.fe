import { reactive } from 'vue';

/**
 * Represents one captured Vue warning / render error, deduped by message.
 */
export interface Diagnostic {
  kind: 'warn' | 'error';
  message: string;
  component: string;
  count: number;
}

const byKey = new Map<string, Diagnostic>();

/** Holds every diagnostic captured since boot, newest last. */
export const diagnostics = reactive<Diagnostic[]>([]);

/** Records a diagnostic, collapsing repeats of the same component+message. */
export function record(kind: Diagnostic['kind'], message: string, component: string): void {
  const key = JSON.stringify([kind, component, message]);
  const existing = byKey.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }
  const entry = reactive<Diagnostic>({ kind, message, component, count: 1 });
  byKey.set(key, entry);
  diagnostics.push(entry);
}

/**
 * Names the component a warning came from.
 *
 * `warnHandler` hands over the PUBLIC instance (the `$` proxy), not the internal
 * one — so `instance.type` is undefined and reaching the options object means
 * going through `$`. Falls back to the first frame of Vue's own component trace,
 * which is the only source for a warning raised while creating a vnode (there is
 * no instance for the thing that failed).
 */
export function componentName(instance: unknown, trace?: string): string {
  const vm = instance as
    { $?: { type?: { name?: string; __name?: string } }; $options?: { name?: string } } | null | undefined;
  const name = vm?.$?.type?.name ?? vm?.$?.type?.__name ?? vm?.$options?.name;
  if (name) return name;
  const frame = trace?.match(/<([A-Za-z][\w.]*)/)?.[1];
  return frame ?? '(unknown)';
}
