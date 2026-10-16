// @wow-two-beta/ui-vue/forms-engine/tanstack — the DEFAULT engine adapter over
// `@tanstack/vue-form` (optional peer; installed only by apps that pin this adapter).
// Implements the full facade contract with TanStack owning values, validation scheduling
// (`revalidateLogic` + a form-level Standard Schema bridge), and the submit lifecycle,
// while the adapter-owned overlay keeps the contract semantics TanStack models
// differently: client/server error merge with per-field clear-on-change, baseline-
// compared dirty (`reset(next)` re-seeds), blur-or-submit touched, contract array
// reindexing of row-scoped errors, and the `submitError` remainder.
//
// Past the contract, `form.engine` exposes the native TanStack instance — typed deep-path
// `engine.Field`/`engine.Subscribe`, per-field validators, listeners — per the 90/10
// escape-hatch rule (docs/analysis/forms-engine.md §4). Overlay-backed semantics apply
// only through the contract surface; native writes follow TanStack's own rules.
//
// `@tanstack/vue-form` shares `form-core` with the React package, so every engine call the
// React adapter made survives verbatim; what changed is the READ side — TanStack's store is
// bridged once into a `shallowRef` so the contract's reactive surface is plain Vue.

import type { FormEngine } from '../../AppForm';

import { useAppForm } from './UseAppForm';

export { useAppForm };
export type { TanstackFormEngine } from './UseAppForm';
export type { TanstackFormOverlay, TanstackOverlayState } from './TanstackFormOverlay';

/** The tanstack adapter as a `FormEngine` — compile-time proof it satisfies the module contract. */
export const tanstackFormEngine = { useAppForm } satisfies FormEngine;
