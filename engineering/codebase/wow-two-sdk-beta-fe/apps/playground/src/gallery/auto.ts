import type { Component } from 'vue';

/**
 * Tells a Vue component apart from everything else a barrel exports.
 *
 * A group barrel mixes components with const-object enums (`ButtonVariant`),
 * composables, and `tailwind-variants` configs — all of them objects or
 * functions with PascalCase-ish names, so the name is no help. `<script setup>`
 * SFCs compile to an object carrying `__name` + `setup`; headless
 * `defineComponent()` primitives carry `setup` or `render`. Nothing else does.
 */
export function isComponent(value: unknown): value is Component {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return '__name' in v || 'setup' in v || 'render' in v || 'template' in v;
}

/** Names every component a barrel exports, sorted, minus the curated ones. */
export function uncoveredComponents(
  namespace: Record<string, unknown>,
  covered: readonly string[],
): { name: string; component: Component }[] {
  const seen = new Set(covered);
  return Object.entries(namespace)
    .filter(([name, value]) => !seen.has(name) && isComponent(value))
    .map(([name, value]) => ({ name, component: value as Component }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Counts every component a barrel exports, curated or not. */
export function allComponentNames(namespace: Record<string, unknown>): string[] {
  return Object.entries(namespace)
    .filter(([, value]) => isComponent(value))
    .map(([name]) => name)
    .sort();
}
