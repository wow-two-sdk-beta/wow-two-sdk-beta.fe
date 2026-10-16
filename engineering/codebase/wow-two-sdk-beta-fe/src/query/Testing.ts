// @wow-two-beta/ui-vue/query/testing — test-only helpers for the query layer, kept out of the
// runtime `/query` barrel so `@vue/test-utils` never leaks into a shipped app bundle. Imported only
// from tests: `import { mountWithQuery, createTestQueryClient, runWithQuery } from
// '@wow-two-beta/ui-vue/query/testing'`.
//
// React's half of this sat on `@testing-library/react`, which has no Vue equivalent; `@vue/test-utils`
// is the counterpart and MOUNTS a component instead of rendering an element, so `renderWithQuery`
// becomes `mountWithQuery` (the old name stays as an alias). `renderHook` has no counterpart at all —
// `runWithQuery` replaces it, and `createQueryWrapper` returns mounting options rather than a
// wrapper component, because that is how a client is provided in a `@vue/test-utils` mount.
export {
  createTestQueryClient,
  mountWithQuery,
  renderWithQuery,
  createQueryWrapper,
  runWithQuery,
  type MountWithQueryOptions,
  type MountWithQueryControls,
  type RunWithQueryControls,
} from './adapters/tanstack/QueryTestUtils';
