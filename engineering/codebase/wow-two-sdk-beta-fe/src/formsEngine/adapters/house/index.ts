// @wow-two-beta/ui-vue/forms-engine/house — the zero-dependency house micro-engine.
// The true vendor hedge behind the `/forms-engine` facade: a flat + dot-path store in a
// `shallowRef`, whole-schema Standard Schema validation (sync or async, with `validateOn`
// timing), push/insert/remove/swap/move array ops with row-scoped error and touched reindexing,
// dirty/touched tracking against a resettable baseline, and the full submit pipeline
// (`mapSubmitError` → `mapFieldPath` → field errors, remainder → `submitError`).
//
// SCOPE CEILING (docs/analysis/forms-engine.md §7 — enforced, not aspirational):
//   - NO typed deep paths (loose string paths; top-level keys infer their value type)
//   - NO per-field async / debounced validators (whole-schema only; async schemas ride `isValidating`)
//   - NO linked-field graphs / listeners
// A form that outgrows this ceiling switches its app's `src/form.ts` pin to the tanstack
// adapter — the house engine must stay a micro-engine, never a third form library.

import type { FormEngine } from '../../AppForm';

import { useAppForm } from './UseAppForm';

export { useAppForm };
export type { HouseFormEngine, HouseFieldState } from './HouseFormCore';

/** The house adapter as a `FormEngine` — compile-time proof it satisfies the module contract. */
export const houseFormEngine = { useAppForm } satisfies FormEngine;
