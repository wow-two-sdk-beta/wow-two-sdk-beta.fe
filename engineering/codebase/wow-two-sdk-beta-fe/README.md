# @wow-two-beta/ui-vue

Vue 3 components, application adapters and browser capabilities for the wow-two ecosystem.
This beta package evolves independently of React. Pin an exact version when upgrading.

## Install

```bash
pnpm add @wow-two-beta/ui-vue vue
```

Vue is required. Install optional peers only for the entries you use:

| Entry                    | Optional peers                                                 |
| ------------------------ | -------------------------------------------------------------- |
| `/router`                | `vue-router@^4`                                                |
| `/query`                 | `@tanstack/vue-query@^5.102.8`                                 |
| `/query/testing`         | `@tanstack/vue-query@^5.102.8`, `@vue/test-utils@^2.4.6`       |
| `/forms-engine/tanstack` | `@tanstack/vue-form@^1`                                        |
| `/styles.css` build      | `tailwindcss@^4.1` plus the application's Tailwind integration |

Core JavaScript entries and the house form adapter do not require these optional peers.
The manifest's `exports` map is the entry inventory; builds fail for missing source entries.

## Use

```vue
<script setup lang="ts">
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import '@wow-two-beta/ui-vue/styles.css';
</script>

<template>
  <Button variant="solid" @click="save">Save</Button>
</template>
```

`styles.css` contains Tailwind 4 source directives; process it through the application's Tailwind build.
It registers the package's own utility classes, which Tailwind otherwise excludes inside `node_modules`.
`themes.css` contains generated theme tokens and `themes.json` their manifest.
Load the theme stylesheet when using a generated theme class.

`platform` is the validated theme every wow-two platform app shares (Wheelhouse's chalk and forest palette).
A platform app imports `themes.css` after `styles.css` and sets `class="theme-platform"` on its root, plus `dark`
for dark mode and `surface-ambient` on the page for the backdrop; the `glass` variants of `Navbar`,
`AppShellHeader` and `Card` take their translucent fill from its card and popover tokens.

The root exports presentation components and the `styles`, `dom`, `optionals`, `state`, `numbers`, `json`, `icons`, `primitives`, `themes`,
`color` and `emoji` namespaces. Dedicated subpaths expose application adapters:

```ts
import { createAppRouter } from '@wow-two-beta/ui-vue/router';
import { queryPlugin, useAppQuery } from '@wow-two-beta/ui-vue/query';
import { useAppForm } from '@wow-two-beta/ui-vue/forms-engine/house';
import { THEMES } from '@wow-two-beta/ui-vue/foundation/themes';
```

Use capability names `/foundation/formatters`, `/foundation/channels`, `/foundation/history`
and `/foundation/validators`. The retired `format`, `sync`, `undo` and `validation` entries are absent.

## Exact numbers and JSON

`foundation/numbers` exposes the immutable `ExactNumber` value/factory. Create values from decimal text
or `bigint`; native safe integers have an explicit factory. Native floating-point inputs cannot recover
precision already lost. Operations return the SDK `Result`:

```ts
import { ExactNumber, NumberRounding } from '@wow-two-beta/ui-vue/foundation/numbers';
import { LosslessJson } from '@wow-two-beta/ui-vue/foundation/json';
import { createApiClient } from '@wow-two-beta/ui-vue/foundation/http';

const left = ExactNumber.parse('0.1');
const right = ExactNumber.parse('0.2');
if (left.ok && right.ok) {
  const sum = left.value.add(right.value);
  if (sum.ok) console.log(sum.value.toString()); // '0.3'
}

const api = createApiClient({ json: LosslessJson });
```

The explicit HTTP codec handles incoming and outgoing numeric tokens without native JSON conversion.
All decoded JSON numbers are `ExactNumber`, including small integers; endpoint decoders validate their
shape and deliberately convert fields that need native integers. Existing clients retain their native
JSON behavior until configured with this codec. FormData bypasses JSON encoding.

Addition, subtraction, multiplication and truncating remainder are exact within the documented resource
budget. Division and rounding require `{ decimalPlaces, rounding: NumberRounding.HalfEven }` (or another
explicit mode). Use `equals`/`compare` for numeric comparison. JavaScript operators, `Math`, native
`JSON.stringify` and identity comparison do not implement custom numeric arithmetic. Numeric/default
coercion and native JSON serialization throw instead of silently approximating; `toApproximateNumber`
is the explicitly lossy conversion. Powers, roots and transcendental functions are not this API's scope.

`LosslessJson` preserves numeric token spelling on parse/write, including exponent notation and negative
zero. Arithmetic produces normalized tokens. It preserves ordinary strings and own object keys, rejects
duplicate decoded keys, and builds null-prototype records. Encoding rejects unsupported custom instances,
accessors, sparse arrays, circular references and native non-integer numbers instead of guessing or dropping
data. Encode domain values such as dates explicitly. `NumberLimits` and `JsonLimits` document centralized
resource budgets; exceeding them returns a failure rather than rounding, wrapping or truncating a value.

## Cookie sessions and write advisories

The backend SDK's SPA antiforgery issues a readable `XSRF-TOKEN` cookie; the client echoes it on unsafe
requests. A token issued before a sign-in or sign-out is refreshed once through `refreshPath`, then retried.
Writes that return `ApiResponse<T>.Ok(data, warnings)` decode with `decodeWarned` and `unwrap: false`:

```ts
import { createApiClient, decodeWarned, wowTwoEnvelope } from '@wow-two-beta/ui-vue/foundation/http';

const api = createApiClient({
  envelope: wowTwoEnvelope,
  credentials: 'same-origin',
  antiforgery: { refreshPath: '/api/runtime-config' },
});
const saved = await api.post('/api/codes', { body, unwrap: false, decode: decodeWarned(decodeCode) });
// saved.value → { data, warnings: [{ property, message, code, severity }] }
```

## Architecture

| Layer                | Responsibility                                                     |
| -------------------- | ------------------------------------------------------------------ |
| `foundation/*`       | Primitives, infrastructure and browser capabilities                |
| `domain/*`           | Color and emoji models and operations                              |
| `presentation/*`     | Actions, display, feedback, forms, layout, navigation and overlays |
| Application adapters | Router, query, auth, feedback, reporting, forms, analytics, flags  |

ESLint enforces dependency direction. Foundation cannot import higher layers.
Application adapters have separate entries to scope optional vendor dependencies.

## Compatibility and verification

The package ships ESM and TypeScript declarations. Consumer checks use strict TypeScript with
`moduleResolution: Bundler` and `skipLibCheck: false`. CommonJS consumption is unsupported.

The sweep's local compatibility baseline is Node 20.10.0, Vue 3.5.41, TypeScript 5.9.3,
Vite 6.4.3, Tailwind 4.3.3 and Playwright 1.62.1. Optional-adapter checks use
Vue Router 4.6.4, Vue Query 5.102.8 and Vue Form 1.33.5. These are tested versions,
not evidence that every version accepted by a dependency range was tested.

Tests distinguish DOM-free imports, Node server rendering, happy-dom interaction and real Chromium behavior.
Chromium runs in ordinary and forced-colors modes. This does not establish hydration, browser or
assistive-technology coverage for every component.

Browser APIs remain subject to secure contexts, permissions and user activation. Read typed outcomes.
Give `LocaleProvider` the same request locale on server and client; its fallback is `en-US`.
Apply browser preferences explicitly after hydration.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm check:package
pnpm check:package --install
```

`typecheck` runs `vue-tsc`, the capability import/cycle check and actual SFC compilation.
`check:package` validates the tarball's exports, runtime imports and strict public types in isolated core
and optional-adapter consumers. `--install` additionally installs the tarball and peers into a fresh npm project.
`--output /absolute/path/package.tgz` retains the exact verified artifact.

Tests live under `tests/`; examples live under `apps/`.
`pnpm playground` starts the playground; `pnpm dev` watches the library build.
Playground source aliases derive from the same public export manifest as the library build.

## Release

The repository's `release-vue` workflow validates, bumps the beta patch version, builds, checks the packed
consumer and publishes that verified tarball. Tags use `ui-vue-v`. React has an independent release.

## License

MIT

## Public runtime support matrix

This matrix covers all **72 manifest export keys**: 68 JavaScript entries and four asset/metadata entries. Public paths below are relative to `@wow-two-beta/ui-vue`; `.` means the package root. The package gate imports/types **64 JavaScript entries without optional adapter peers**, then all **68 with the selected peers installed**, in Node without DOM globals. Those are import/declaration checks: they do not invoke every browser operation or prove component server rendering. The final release artifact must rerun `check:package` after source changes.

Verified baseline: Node **20.10.0**, Vue **3.5.41**, TypeScript **5.9.3**, ES2022 ESM build output, and Chromium **151.0.7922.34** with Playwright **1.62.1**. Chromium normal/forced-colors checks pass **30 tests across six project files**. Firefox and WebKit behavior is unverified; **no broader browser minimum is verified**. ES2022 is a compilation target, not evidence of browser API/CSS availability. Peer ranges describe install compatibility, not an assertion that every allowed version was tested. Optional adapters' tested versions appear above.

Server evidence labels: **fixtures** means only the named suite's concrete render cases, **import only** means no entry-wide server-render claim, and **asset** is not a JavaScript runtime entry. Pure operations can run in Node when their listed platform inputs exist; Vue hooks require their documented owning scope. Browser methods remain conditional on API presence, permission, secure context, user activation and host policy. Their declared Result/state/error contract governs unavailable APIs; this table does not turn every method into the same fallback.

| Public subpath                 | Server/render evidence                                                             | Runtime requirements when used                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `.`                            | import only                                                                        | Union of re-exported core/presentation requirements; no optional adapter peers            |
| `./foundation/state`           | import only                                                                        | Vue scope/reactivity; caller-owned state                                                  |
| `./foundation/icons`           | fixtures: corresponding foundation `*.ssr.test.ts`                                 | Vue + SVG; Lucide dependency                                                              |
| `./foundation/primitives`      | fixtures: corresponding foundation `*.ssr.test.ts`                                 | Mounted DOM; focus/events/Teleport; observer/positioning APIs per primitive               |
| `./foundation/themes`          | import only                                                                        | Theme data is pure; applying a theme needs a DOM root and shipped CSS                     |
| `./foundation/http`            | import only                                                                        | Fetch, Headers, Request/Response, AbortController; caller supplies origin/auth            |
| `./foundation/results`         | import only                                                                        | No browser API                                                                            |
| `./foundation/storage`         | import only                                                                        | Memory storage or selected Storage API; persistence is caller-owned                       |
| `./foundation/storage/zustand` | import only                                                                        | Caller-supplied compatible store; selected persistence backend                            |
| `./foundation/resilience`      | import only                                                                        | Timers/AbortSignal when retry/timeout operations run                                      |
| `./foundation/identifiers`     | import only                                                                        | Crypto/random source for generated identifiers                                            |
| `./foundation/i18n`            | locale render/hydration probe only; other exports import only                      | Intl; explicit request locale for deterministic first render                              |
| `./foundation/config`          | import only                                                                        | Caller-supplied configuration sources                                                     |
| `./foundation/shortcuts`       | import only                                                                        | Mounted event target and keyboard events                                                  |
| `./foundation/formatters`      | import only                                                                        | Intl for localized formatters                                                             |
| `./foundation/files`           | import only                                                                        | File/Blob and URL/FileReader/browser download APIs for selected operations                |
| `./foundation/commands`        | import only                                                                        | Vue scope and caller command handlers; keyboard binding needs DOM                         |
| `./foundation/errors`          | import only                                                                        | No browser API for classification                                                         |
| `./foundation/share`           | import only                                                                        | Web Share or selected clipboard fallback; activation/permission policy                    |
| `./foundation/logger`          | import only                                                                        | Caller log sink; console sink uses host console                                           |
| `./foundation/device`          | import only                                                                        | Browser preference/device APIs when observed; server fallback is operation-specific       |
| `./foundation/notifications`   | import only                                                                        | Notification/Permissions APIs; secure context and permission for requests                 |
| `./foundation/uploads`         | import only                                                                        | Caller upload transport; File/Blob and AbortSignal                                        |
| `./foundation/gestures`        | import only                                                                        | Mounted DOM, Pointer/Touch events and geometry                                            |
| `./foundation/selection`       | import only                                                                        | Vue state; DOM only when consumer binds interactions                                      |
| `./foundation/media`           | import only                                                                        | HTML media APIs; MediaDevices/MediaRecorder for selected operations and permissions       |
| `./foundation/animation`       | import only                                                                        | DOM geometry + Web Animations when animation runs; reduced-motion preference              |
| `./foundation/virtualization`  | import only                                                                        | Mounted scroll container and geometry/ResizeObserver                                      |
| `./foundation/observers`       | import only                                                                        | Selected IntersectionObserver/ResizeObserver/MutationObserver; mounted target             |
| `./foundation/crypto`          | import only                                                                        | Web Crypto + TextEncoder; secure context for SubtleCrypto operations                      |
| `./foundation/channels`        | import only                                                                        | BroadcastChannel or configured channel backend; owned cleanup/timers                      |
| `./foundation/idb`             | import only                                                                        | IndexedDB for database operations; explicit availability checks                           |
| `./foundation/workers`         | import only                                                                        | Worker supplied/created by caller; CSP and worker loading policy                          |
| `./foundation/screen`          | import only                                                                        | Selected Fullscreen/Wake Lock/orientation API; activation/secure-context policy           |
| `./foundation/geolocation`     | import only                                                                        | Geolocation; secure context and permission                                                |
| `./foundation/async`           | import only                                                                        | Promises, timers and AbortSignal; no DOM requirement for pure coordination                |
| `./foundation/history`         | import only                                                                        | Caller-owned undo state; shortcut binding needs DOM                                       |
| `./foundation/clipboard`       | import only                                                                        | Clipboard API or selected fallback; permissions/activation may apply                      |
| `./foundation/speech`          | import only                                                                        | SpeechSynthesis/voice events for speech operations                                        |
| `./foundation/collections`     | import only                                                                        | No browser API                                                                            |
| `./foundation/datetime`        | import only                                                                        | Imported temporal-polyfill implementation; no global installation                         |
| `./foundation/validators`      | import only                                                                        | No browser API for native schemas; caller Standard Schema may add requirements            |
| `./foundation/net`             | import only                                                                        | EventSource/WebSocket for connections; timers, online events and caller polling transport |
| `./foundation/oauth`           | import only                                                                        | Mounted DOM + Google Identity script/network; CSP and provider configuration              |
| `./analytics`                  | import only                                                                        | Caller-owned adapter/client; browser sinks require their platform APIs                    |
| `./flags`                      | fixtures: `tests/unit/providers/Providers.ssr.test.ts` (registered cases only)     | Caller-owned provider/flag source                                                         |
| `./domain/color`               | import only                                                                        | No browser API for color math                                                             |
| `./domain/emoji`               | import only                                                                        | No browser API for emoji data/search                                                      |
| `./presentation/actions`       | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./presentation/display`       | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./presentation/feedback`      | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./presentation/forms`         | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./presentation/layout`        | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./presentation/nav`           | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./presentation/overlays`      | fixtures: corresponding `tests/unit/presentation/*/*.ssr.test.ts`                  | Vue + DOM for interaction; per-component API requirements; shipped styles                 |
| `./router`                     | ProgressProvider SSR fixture only; router lifecycle is not covered by that fixture | vue-router peer; browser history requires DOM, server callers use memory history          |
| `./query`                      | import only                                                                        | @tanstack/vue-query peer; per-app/request QueryClient and caller fetch transport          |
| `./query/testing`              | import only                                                                        | @tanstack/vue-query + @vue/test-utils peers; DOM for mounting helpers                     |
| `./auth`                       | fixtures: `tests/unit/providers/Providers.ssr.test.ts` (registered cases only)     | Per-app strategy/bridge; browser storage/redirect operations are strategy-specific        |
| `./feedback`                   | import only                                                                        | Vue provider/host; mounted DOM for rendered notices                                       |
| `./reporting`                  | import only                                                                        | Caller-owned sink/ingest; click, error and page capture require DOM; screenshot app-owned |
| `./forms-engine`               | import only                                                                        | Vue + Standard Schema contract; focus helpers require DOM                                 |
| `./forms-engine/house`         | import only                                                                        | Vue-owned form scope; transport signal handled by caller                                  |
| `./forms-engine/tanstack`      | import only                                                                        | @tanstack/vue-form peer; Vue-owned form scope and caller transport                        |
| `./styles.css`                 | asset                                                                              | Bundler/CSS import; package source scanning and app theme composition                     |
| `./themes.css`                 | asset                                                                              | CSS theme tokens; apply the selected theme on an app-owned root                           |
| `./themes.json`                | asset                                                                              | JSON consumer; no browser runtime                                                         |
| `./package.json`               | asset                                                                              | Package metadata reader; no browser runtime                                               |
| `./foundation/styles`          | import only                                                                        | Class/variant utilities are pure; applied appearance needs shipped CSS                    |
| `./foundation/dom`             | import only                                                                        | Most operations need a mounted DOM target; pure normalization has no DOM requirement      |
| `./foundation/optionals`       | import only                                                                        | No browser API                                                                            |
| `./foundation/numbers`         | pure numeric operations                                                            | Exact-value methods; explicit precision and rounding for division; no browser API          |
| `./foundation/json`            | pure parsing and encoding                                                          | Lossless numeric tokens; explicit resource budgets; no browser API                         |

### SSR, hydration and ownership limits

Node SSR fixtures create a fresh Vue app and call `renderToString` without DOM globals (`tests/support/Smoke.ts`). A successful fixture proves its selected props/slot/provider setup, not every branch, Teleport hydration or full request-resource cleanup. A separate locale probe checks two independent roots, provider replacement and deterministic happy-dom hydration even when browser language differs. No package-wide hydration guarantee is made. Portal/Teleport content requires the app's supported server/client composition; modal and focus behavior is accepted through browser tests, not Node render output.

Create mutable auth bridges, query clients, form engines, stores and buses per app/request. Share only immutable data or non-user formatting caches. Server code must explicitly release any resources it starts; client unmount hooks do not run after server rendering. Provider smoke tests do not establish that every arbitrary adapter supplied by a caller disposes correctly.

Focused lifecycle evidence includes auth strategy replacement/unmount and stale sign-in/out, query-client isolation and stale lazy-query reset/disposal, form reset/cancel/session invalidation, and locale root isolation. Passing real-browser focus-scope tests cover nested/portalled layers, owner documents, inert restoration and dismissal cleanup in ordinary and forced-colors Chromium. Representative public root-ref tests exercise native focus/measurement and unmount lifetime under happy-dom. This evidence does not establish geometry or keyboard acceptance for every component or browser.

`foundation/datetime` imports its declared Temporal implementation locally; it does not patch a global prototype. Apps using native Temporal elsewhere own that global/runtime policy. Feature-specific API availability must be checked at the operation boundary, even on the tested Chromium baseline. Stylesheet support and forced-colors/reduced-motion behavior are separate from JavaScript import support.
