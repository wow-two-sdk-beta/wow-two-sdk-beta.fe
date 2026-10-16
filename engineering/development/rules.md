# wow-two-sdk-beta.fe — Engineering Rules

*Last updated: 2026-10-16*

> Working rules for agents in this repo — repo-specific deltas only. Shared rules: wow-two-ws/conventions/.
> Planning: [`backlog.md`](../planning/backlog.md) and the newest [`version-track/`](../planning/version-track/) folder.

## Scope

- Product migration work (ForeverPin, `smart-qr`) belongs to the product repository, not this SDK lane.
- Engine-wrapping work follows `conventions/development/swappable-modules.md`.
- A new component ships source, spec, gallery fixture, focused DOM tests and the SSR/mount breadth cases, and
  passes the package gates.
- A renamed public prop keeps its old name one release as a deprecated alias.

## Parallel lanes

- Parallel agents edit one working tree on one branch; disjoint file sets only, no worktrees.
- Fence each agent to its own files or directory — two agents editing one file lose writes.
- Run the package gates once per batch after the fan-out, never per agent.
- Re-measure with the item's own grep afterwards; an agent's self-report is not the verdict.
- A source inventory or smoke render does not prove every interaction; record reviewed groups, focused tests,
  gates and remaining limits separately.
- Agents stage scoped batches and commit under the repository's commit flag; the developer publishes and CI
  bumps `0.0.y`.

## Convention sweeps

- Run the convention gate per area first (delete port provenance, restated rules, usage examples), compact
  second, wrap third — wrapping first re-flows text the gate would have deleted.
- Measure line length with python3 `len()`: macOS `awk 'length>120'` counts bytes, and these files carry `—` `·` `→`.
- BSD `sed` ignores `\b` and still exits 0; use `perl -pi -e` and re-grep the old name.
- Keep four gates green after every area: `pnpm typecheck` (`vue-tsc` + `check-sfc`), `pnpm format:check`,
  `pnpm test`, `pnpm lint` at 0 errors.
- `check-sfc` has no substitute: moving `/* @vue-ignore */` above a multi-entry `extends` breaks it while every
  other gate passes.

## Vue package

1. `vue-tsc` green is not buildable: `@vue/compiler-sfc` resolves `defineProps<T>()` with a narrower resolver.
   `scripts/check-sfc.mjs` runs the real `compileScript` over every SFC inside `pnpm typecheck`.
2. `VariantProps<typeof xVariants>` prop types break that resolver. Spell the union out and lock it with
   `AssertExact` (`presentation/layout/stack/Stack.vue`), or mark the heritage `/* @vue-ignore */`.
3. `defineOptions()` cannot reference a local const — it is hoisted outside `setup()`.
4. An optional `Boolean` prop with no default is cast to `false`; a tri-state boolean needs `x: undefined` in
   `withDefaults`.
5. Use `inheritAttrs: false` + `cn(attrs.class)`, never `inheritAttrs: true` — fallthrough concatenates `class`
   without tailwind-merge, so consumer classes stop winning.
6. `vue/no-reserved-component-names` is off for `src/presentation/**`; no component is globally registered.
7. `VNodeChild`-typed props are Boolean-castable: an absent node prop arrives as `false`, so every
   `x !== undefined` guard reads truthy. Give each node-valued prop `default: undefined`.
8. A declared hyphenated prop is camelized (`'aria-label'` → `props.ariaLabel`). Keep `aria-*` as fallthrough
   attrs; relocate through `attrs['aria-label']` when an inner node needs it.
9. Chained listeners arrive as arrays in `attrs.onClick`; normalize before calling.
10. Every SFC carries a plain `<script lang="ts">` block (exported interfaces, `as const` enums) beside
    `<script setup lang="ts">`; a setup-only SFC trips `ignoreRestSiblings` on the
    `const { class: _class, ...others } = attrs` idiom. An empty exported props interface inline-disables
    `no-empty-object-type`.
11. A `TPath extends string` param widens to `string` in templates and slot payloads fall to `unknown`;
    constrain with `(keyof TValues & string) | (string & {})`.
12. Vue drops an event stamped in the millisecond its listener attached; DOM tests wait for `Date.now()` to
    advance after mounting (`MenuVector.dom.test.ts` `settle()`).

- Forward attrs in this order: `inheritAttrs: false` → own attrs → `v-bind="rest"` → own handlers last, each
  guarded by `if (event.defaultPrevented) return`.
- A callback whose presence picks an element or a role stays a prop, not an emit — Vue strips a declared
  emit's listener from `useAttrs()`.
- Nothing that is not shipped code goes inside the package: `tests/**` is typechecked and `src/**` is published.
- Back each state member and field slice with its own `computed`; raw getters wake every reader on every commit.
