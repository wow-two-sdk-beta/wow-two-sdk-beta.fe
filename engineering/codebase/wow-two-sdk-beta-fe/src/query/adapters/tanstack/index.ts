// @wow-two-beta/ui-vue/query — data layer over TanStack Query v5. A thin, opinionated wrapper: house
// QueryClient defaults + a configurable retry policy (from `foundation/resilience`), raw→domain
// query / mutation / batch / paginated / lazy / infinite / suspense composables that coerce failures
// to the SDK `ApiFailure`, an imperative cache accessor, intent-based prefetch, opt-in localStorage
// persistence, a dev-only devtools mount, and a `QueryProgressBridge` that drives the router's manual
// heartbeat while requests are in flight. Mutations are passive by default (`useAppMutation` —
// server-confirmed reconcile only); `useOptimisticMutation` opts into the canonical cancel → snapshot
// → patch → rollback-on-error → invalidate-on-settle flow.
//
// API SHAPE, AND WHY. `@tanstack/vue-query` returns a REF per field and takes `MaybeRefOrGetter`
// options, so every composable here returns refs (`data.value`, or bind it in a template) and takes
// `key` / `enabled` / `page` as ref-or-getter. It also installs as an app PLUGIN — `queryPlugin` is
// the idiomatic mount, `<QueryProvider>` is the component form, built on the library's own injection
// key. There is no `useSuspenseQuery` in the Vue package (Vue suspends on an async `setup()`, not on
// a thrown promise), so `useAppSuspenseQuery` is an ASYNC composable you `await`.
//
// `@tanstack/vue-query` is an OPTIONAL peer — this subpath carries it so every other entry stays
// TanStack-free (mirrors how `/router` isolates vue-router). Apps declare their own per-resource
// endpoint factories over `defineEndpoint` (key + fetcher typed once — the data-layer parallel to the
// router's `paths`/`definePath`); the factories and their `queryKeys` hierarchies stay app-local and
// are NOT exported here. Test helpers live at `@wow-two-beta/ui-vue/query/testing` (kept out of this
// runtime barrel).

// Foundation
export {
  createQueryClient,
  type CreateQueryClientOptions,
  type AppQueryClient,
  type AppQueryMeta,
  type QueryErrorContext,
} from './CreateQueryClient';
export { queryPlugin } from './QueryPlugin';
export { default as QueryProvider, type QueryProviderProps } from './QueryProvider.vue';
export { toApiFailure } from './QueryOutcome';
export { defineEndpoint, type Endpoint, type EndpointFn } from './Endpoints';

// Core composables
export { useAppQuery, type UseAppQueryOptions, type UseAppQueryReturn } from './hooks/UseAppQuery';
export {
  useAppInfiniteQuery,
  type UseAppInfiniteQueryOptions,
  type UseAppInfiniteQueryReturn,
} from './hooks/UseAppInfiniteQuery';
export { useAppMutation, type UseAppMutationOptions, type UseAppMutationReturn } from './hooks/UseAppMutation';
export {
  useOptimisticMutation,
  type UseOptimisticMutationOptions,
  type OptimisticTarget,
} from './hooks/UseOptimisticMutation';
export {
  useAppQueries,
  type UseAppQueriesOptions,
  type UseAppQueriesReturn,
  type AppQueriesEntry,
  type AppQueryState,
} from './hooks/UseAppQueries';
export {
  useAppPaginatedQuery,
  type UseAppPaginatedQueryOptions,
  type UseAppPaginatedQueryReturn,
} from './hooks/UseAppPaginatedQuery';
export { PageExtensions } from '../../PageExtensions';
export { useRefresh, type UseRefreshOptions, type UseRefreshReturn } from '../../UseRefresh';
export { useAppLazyQuery, type UseAppLazyQueryOptions, type UseAppLazyQueryReturn } from './hooks/UseAppLazyQuery';
export { useQueryCache, type QueryCacheApi, type QueryCachePrefetch } from './hooks/UseQueryCache';

// Prefetch + suspense
export { usePrefetchQuery, prefetchProps, type PrefetchTarget, type PrefetchProps } from './hooks/UsePrefetchQuery';
export {
  useAppSuspenseQuery,
  type AppSuspenseQueryOptions,
  type AppSuspenseQueryReturn,
} from './hooks/UseAppSuspenseQuery';

// Integrations
export { QueryProgressBridge, useQueryProgressBridge } from './QueryProgressBridge';
export { default as QueryDevtools, type QueryDevtoolsProps } from './queryDevtools/QueryDevtools.vue';
export { setupQueryPersistence, type SetupQueryPersistenceOptions, type QueryPersistenceHandle } from './Persistence';
