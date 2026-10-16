# Vue SDK component and primitive audit

Scope: `engineering/codebase/wow-two-sdk-beta-fe` in `wow-two-sdk-beta.ui`. Source ownership for this lane was `src/presentation/**`, `src/foundation/primitives/**`, then `src/foundation/dom/**` and `src/foundation/icons/**`, plus matching tests. No apps, CI, package configuration, Git mutations, or commits were performed by this lane.

## Evidence boundary and coverage

The exact-path ledger is `/private/tmp/sdk-components-coverage.json`. It contains 1,143 paths (759 source files, 55,073 source lines), across all four assigned roots. The inventory scanner read all files and classified sources for lifecycle hooks, observers, event listeners, raw HTML, registries, sorting, spread argument calls, storage and pointer handling. That is full content inventory, not exhaustive semantic review.

58 source files received full-source semantic review and 9 received selected-function semantic review. This includes every non-index primitive implementation, risk-prioritized presentation implementations, the affected DOM hooks, and Icon/Spinner. The ledger distinguishes these categories from automated-only content inventory and document-only inventory. Neither this lane nor its artifact establishes exhaustive behavioral correctness of the other source paths. Browser integration and whole-package gates belong to the parent task.

## Resolved defects and improvements

| Area | Reproduction / effect | Resolution and verification |
| --- | --- | --- |
| Roving focus | Keyed children reordered a,b,c → a,c,b, but ArrowRight from a still moved to b. Replacing the primitive root kept the disabled observer on the old node. | Navigate by current DOM order; replace the registered node and observer together with scope cleanup. Two DOM regressions pass. |
| Four item registries | Listbox, combobox, menu and command palette all reproduced the same stale registration-order navigation after keyed reorder. | Shared `DomOrderExtensions.inDocumentOrder` orders enabled/visible item snapshots using live nodes, resolves each node once, preserves disconnected order and does not mutate the registration array. Four failing-before/passing-after DOM regressions. Lookups use the input/root owner document. |
| IME command activation | Composing Enter selected the active command and closed the palette. | Ignore composing key events; regression checks composition does not activate, while the subsequent ordinary Enter does. Failed before the guard and passes afterward. |
| Slot / asChild | Rebuilding a child's VNode dropped its `v-show` directive. | Preserve directive bindings, transition and scope metadata during reconstruction. A hidden → visible → hidden regression passes. Private `slotScopeIds` is guarded rather than assuming it exists on the public VNode type. |
| CountUpText | After first viewport entry, later target changes created an observer but never started another animation. Invalid/negative/infinite durations could keep frames alive. | Observe until the first trigger, disconnect at that trigger, animate later targets directly, settle invalid/nonpositive duration immediately, and always finish at the exact target. |
| AnimatedNumberText and CountUpText | Turning on reduced motion during an existing animation did not cancel it. AnimatedNumberText accepted negative duration into frame math. | Watch live motion preference, cancel pending frames and settle the target. Eight display lifecycle regressions cover retargeting, zero/negative/NaN/infinite duration and motion changes. Relevant component specs updated. |
| DataTable | Sort accessors ran repeatedly inside comparisons: 1,458 calls for the deterministic 128-row fixture. | Decorate each row once before the stable sort: 128 calls afterward, preserving equal-key order. This is an operation-count measurement, not a wall-time claim. |
| Sparkline | 150,000 points caused `Math.min(...data)` / `Math.max(...data)` to exceed the engine's argument limit. | Linear bounds scan without spread calls. Regression renders all 150,000 points and verifies line endpoints and finite output. |
| NodeEditor | fitView used four intermediate mapped arrays and four spread calls to get graph bounds. | One bounds loop removes those allocations and argument-limit exposure. Existing five editing behavior tests pass; no large-graph wall-time claim. |
| SelectPickerItem | Changing a mounted item's value left both old and new keys registered. | Unregister the old key before registering the new one. Regression verifies only the current key remains and unmount clears it. |
| ScrollSpy | The immediate watcher ran before same-component headings mounted, so a static heading list was never observed. Old active IDs also survived empty targets. | Track mount readiness in observation sources; clear seen/active state when observation resets. Regression verifies same-render headings, activation, target removal and observer disconnection. |
| Focus trap | A disabled button with tabindex=0 was selected by autofocus because the generic tabindex selector bypassed disabled filtering. | Filter disabled and hidden/inert controls, all negative explicit tab indices, and visibility; use owner-document focus state and connected restoration targets. Regression passes. |
| Scroll lock | Existing 12px body padding plus a 20px scrollbar became 20px instead of 32px. | Add scrollbar compensation to computed padding, preserving the original inline value until the last nested lock releases. Regression passes. |
| Event listener cleanup | Cleanup used a mutable options object, allowing capture changes to leave the original listener installed. | Capture the registration's capture flag and use it for removal. Focused regression verifies one listener across a reactive capture change and none after unmount. |
| Outside click | A shadow-root click can be retargeted to its host; targets in another document require that document's listener. | Check composed path as well as containment, bind involved owner documents, and clean them up. Shadow-root and iframe-document regressions pass. These are focused mechanism checks; no claimed failing-before run for these two fixes. |
| ScrollViewport | Spreading a string style into an object threw in CSSStyleDeclaration; numeric dimensions lacked pixel units. | Normalize style arrays with Vue, convert number dimensions to px and retain caller style precedence. Regression covers number dimensions and string color. |
| ColorModeProvider | Storage SecurityError broke setup; explicit dark default rendered light on the server; system mode was a one-time snapshot. | Guard storage reads/writes, use deterministic explicit defaults during SSR, initialize stored/system state after mount, follow system changes until user selection, and keep in-memory controls working when persistence fails. DOM and SSR regressions pass. |

## Refuted hypothesis

Icon's computed accessibility state was suspected of becoming stale because it uses attrs. A real host-driven dynamic `aria-label` regression passes with the installed Vue version: decorative → labelled → decorative toggles `aria-hidden` and `role` correctly. Icon source was not changed. The added regression remains to protect the behavior.

## Validation

- Focused ESLint on all changed lane source/tests: clean. Final lint log `/private/tmp/sdk-components-lint-final.log` is empty.
- Focused DOM + SSR suite: **22 files, 420 tests passed**, log `/private/tmp/sdk-components-tests-final.log`.
- One subsequent IME regression was added and its affected file rerun: **5/5 registry tests passed** (the four prior registry tests plus the new IME case). That last two-file change also passed ESLint and Prettier.
- A full `vue-tsc --noEmit -p tsconfig.typecheck.json` run before the final provider additions passed. The latest full run has **only two playground errors**, both in `apps/playground/src/theme.ts`: missing `ThemeCatalog` export and the inferred-any theme callback. No lane source or test diagnostics remain. Log `/private/tmp/sdk-components-types-final.log`; parent has been notified and owns cross-lane reconciliation.
- Earlier individual regressions were deliberately run before fixes for registry order, Slot directives, display lifecycle, Select stale registration, ScrollSpy mount, disabled focus, scrollbar padding, ScrollViewport, ColorMode storage/SSR, and the IME case. Additional focused checks cover listener/shadow-document cleanup.
- Existing overlay, input, primitive, icon, display and graph tests were included in progressive lane suites. Whole-package lint/typecheck/build/package checks and actual browser interaction remain parent-owned; unit/DOM tests do not prove all browser focus/geometry behavior.

## Optimization conclusions

The strongest confirmed improvements were algorithmic and lifecycle-related: one accessor evaluation per row for sorting, bounded-memory extrema scans, observer/frame/listener cleanup, and keyboard navigation based on current render order. The DOM-order helper intentionally spends sorting work during keyboard navigation to retain correctness under keyed changes; no blanket render-time sorting or deep watches were introduced. Node lookup is decorated once per ordering call.

No general component API rewrite was necessary to resolve the reproduced issues. Full behavioral review of the automated-only source inventory remains a coverage limit, not a list of proven defects. A future performance claim about large menus/graphs, overlay positioning or virtualized rendering needs browser profiles with representative content; current evidence is precise operation counts and correctness tests.
