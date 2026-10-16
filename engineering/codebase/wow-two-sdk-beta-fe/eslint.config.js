import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'apps/**', 'scripts/**', '*.config.{js,ts}'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // `flat/essential`, not `flat/recommended`: essential = the correctness rules (no-mutating-props,
  // require-v-for-key, …). The recommended tier layers ~30 formatting rules (max-attributes-per-line,
  // html-indent, …) that fight the repo's Prettier config — the React package's ESLint carries zero
  // formatting rules for the same reason. Formatting is Prettier's job, lint is correctness'.
  ...pluginVue.configs['flat/essential'],
  {
    // SFC `<script lang="ts">` blocks: vue-eslint-parser owns the file, typescript-eslint's
    // parser owns the script block. Without this, TS syntax inside an SFC is a parse error.
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    // `typescript-eslint/eslint-recommended` — the block that switches OFF the base rules the
    // compiler already covers — scopes itself to `**/*.{ts,tsx,mts,cts}`, so inside an SFC's
    // `<script lang="ts">` those base rules stay ON and misfire on TS-only shapes (a const object
    // plus a same-named type alias trips `no-redeclare`; imported types trip `no-undef`).
    // Re-apply the same offs here, read from the preset so the two never drift.
    rules: { ...tseslint.configs.eslintRecommended.rules },
  },
  {
    // Line width. Prettier owns CODE width via `printWidth: 120` but never reflows a comment, so the
    // rule that actually holds prose to the wrap is this one. `warn` until the package-wide sweep
    // closes — 385 comment lines across 187 files predate it, and an error would hide new ones in
    // the backlog's noise. Promote to `error` once the sweep lands.
    files: ['src/**/*.{ts,vue}', 'tests/**/*.{ts,vue}'],
    rules: {
      'max-len': [
        1,
        {
          code: 120,
          comments: 120,
          tabWidth: 2,
          // A lone template `class="…"` attribute — Prettier keeps a long utility chain on one line
          // and there is nowhere to break it. Everything else in a template fits.
          ignorePattern: '^\\s*class="[^"]*"$',
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  {
    // Components are one-per-folder PascalCase files (`Button.vue`) — single-word names are
    // the convention here, not a smell. Scoped to `{ts,vue}` because headless primitives are
    // authored as `defineComponent()` in plain `.ts`, which the rule also inspects.
    files: ['**/*.{ts,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      // Off, measured: the rule flags 45 sites and 42 are the read-once seed of an uncontrolled
      // component (`ref(props.defaultOpen)`, `useControlled`'s `default:` option), which it cannot
      // tell apart from a genuine loss. The ban it would guard — reactive props destructure — has 0
      // sites, so review carries it. See macros.md § *Reading a prop*.
      'vue/no-setup-props-reactivity-loss': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    plugins: {
      boundaries,
    },
    settings: {
      // REQUIRED for boundaries to work at all: the plugin resolves import targets via
      // eslint-module-utils, whose default node resolver can't resolve .ts/.vue — every
      // target then classifies as "unknown" and boundaries/element-types silently passes.
      // Smoke-test after touching this config: add `import * as x from '../presentation/actions'`
      // to a file in src/auth/ → `pnpm exec eslint` on it MUST error (then remove it).
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['tsconfig.json'],
          extensions: ['.ts', '.vue', '.js', '.json'],
        },
      },
      'boundaries/elements': [
        // Physical layer folders under src/. Foundation = infra (no upward deps);
        // domain = pure types/ops (may use foundation); presentation = components
        // (may use foundation + domain + sibling presentation).
        {
          type: 'foundation',
          pattern: 'src/foundation/*/**',
        },
        {
          type: 'domain',
          pattern: 'src/domain/*/**',
        },
        {
          type: 'presentation',
          pattern: 'src/presentation/*/**',
          capture: ['group'],
        },
        // Router = standalone top-level subpath layer above presentation; composes
        // presentation (AppNavLink → NavItem) + foundation, never imported by them.
        { type: 'router', pattern: 'src/router/**' },
        // Query = standalone top-level subpath data layer; composes foundation (ApiError coercion)
        // + router (QueryProgressBridge → useNavigationProgress), never imported by them.
        { type: 'query', pattern: 'src/query/**' },
        // Auth = standalone top-level subpath session layer; peer-free, composes
        // foundation only (http client seams), never imported by other layers.
        { type: 'auth', pattern: 'src/auth/**' },
        // Feedback = standalone top-level subpath notice bus; peer-free, composes
        // foundation only (Severity vocabulary, ApiError type) — NEVER presentation.
        // Presentation adapters (FeedbackToastHost) import it, not the other way round.
        { type: 'feedback', pattern: 'src/feedback/**' },
        // Reporting = standalone top-level subpath incident capture; peer-free, composes foundation only
        // (errors, http failure shapes, logger redaction). Feedback offers its send on a notice and
        // presentation binds it to a Report action — both import it, never the other way round.
        { type: 'reporting', pattern: 'src/reporting/**' },
        // Forms-engine = standalone top-level subpath forms facade (contract + engine
        // adapters); composes foundation only (FormControl provide/inject, http error
        // seams) — NEVER presentation: label/error chrome (presentation `Field`,
        // `FormErrorMessage`) composes INSIDE the slot, app- or presentation-side.
        { type: 'formsEngine', pattern: 'src/formsEngine/**' },
        // Analytics + flags = standalone top-level subpath layers, peer-free, composing foundation only.
        // Like `feedback`, they are headless buses/evaluators a presentation adapter may consume — never
        // the other way round.
        { type: 'analytics', pattern: 'src/analytics/**' },
        { type: 'flags', pattern: 'src/flags/**' },
        { type: 'root', pattern: 'src/index.ts' },
      ],
    },
    rules: {
      // Surface imports of local files that match no boundaries/elements pattern —
      // element-types ignores unknowns, so without this a typo'd/unmodeled layer slips through.
      'boundaries/no-unknown': 2,
      'boundaries/element-types': [
        2,
        {
          default: 'disallow',
          rules: [
            { from: ['foundation'], allow: ['foundation'] },
            // Self-allow is required (as in every other layer): each file is its own
            // element instance, so even `./sibling` imports inside one domain cross elements.
            { from: ['domain'], allow: ['foundation', 'domain'] },
            // Presentation → foundation + domain + any sibling presentation group.
            // Cross-group composition is allowed at all layers. Convention: L3 atoms /
            // L4 molecules stay in-group when natural; L5+ organisms compose freely.
            // The lint rule is permissive.
            // `feedback` here = the headless bus module a presentation adapter may subscribe to;
            // `reporting` = the incident send a toast binds to its Report action.
            { from: ['presentation'], allow: ['foundation', 'domain', 'presentation', 'feedback', 'reporting'] },
            { from: ['router'], allow: ['foundation', 'domain', 'presentation', 'router'] },
            { from: ['query'], allow: ['foundation', 'router', 'query'] },
            { from: ['auth'], allow: ['foundation', 'auth'] },
            { from: ['feedback'], allow: ['foundation', 'feedback', 'reporting'] },
            { from: ['reporting'], allow: ['foundation', 'reporting'] },
            { from: ['formsEngine'], allow: ['foundation', 'formsEngine'] },
            { from: ['analytics'], allow: ['foundation', 'analytics'] },
            { from: ['flags'], allow: ['foundation', 'flags'] },
            { from: ['root'], allow: ['foundation', 'domain', 'presentation'] },
          ],
        },
      ],
    },
  },
  {
    // The component vocabulary collides with HTML by design — `Center`, `Frame`, `Spacer`,
    // `Section`, `Link`, `Image`, `Code`, `Mark`, `Quote`, `List`, `Table` and more are the
    // names the React package already ships, and D5 keeps them. The rule guards against
    // GLOBAL registration shadowing a real tag; every component here is imported explicitly
    // in the consumer's `<script setup>`, so it can never shadow one. Scoped off rather than
    // silenced per-file: ~20 of the 237 components would otherwise carry a disable comment.
    files: ['src/presentation/**/*.{ts,vue}'],
    rules: {
      'vue/no-reserved-component-names': 'off',
    },
  },
  {
    // Test files + the local test kit cross layers freely — they exercise, not ship.
    files: ['tests/**/*.{ts,vue}'],
    rules: {
      'boundaries/element-types': 'off',
      'boundaries/no-unknown': 'off',
    },
  },
);
