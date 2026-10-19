// @wow-two-beta/fe/router — declarative routing wrapper over vue-router v4. Apps author routes
// as a `RouteConfig` and pass them to `createAppRouter`; this module owns the vue-router machinery
// (scroll behavior, the `*` catch-all, and the root behaviors) plus a suite of nav helpers. Apps
// declare their own typed `paths` registry over the exported `definePath`.
//
// WHAT MOVED, AND WHY. react-router hung its root behaviors off an `<AppRoot>` LAYOUT ROUTE that
// rendered `<Outlet/>`; vue-router installs as a plugin, has no root element, and expresses
// "on every navigation" as `afterEach`. So `<AppRoot>` is gone and its five children became router
// hooks — `installDocumentTitle` · `installDocumentMeta` · `installRoutePersistence` ·
// `installPageViewTracker`, plus the scroll behavior folded into `createRouter`. `createAppRouter`
// installs all of them from the same options React's `AppRoot` took, so an app that only calls
// `createAppRouter` sees no difference. `RouteAnnouncer` stayed a component: it owns a live region.
//
// Guards replace loaders: a route's `guard` chain compiles to the record's `beforeEnter`, and its
// `handle` compiles to the record's native `meta` — `route.meta.title` reads it with no helper, and
// there is no `useMatches()` to reach for.
//
// `vue-router` is an OPTIONAL peer — this subpath carries it so every other entry stays
// vue-router-free.

// Core wrapper + declarative model
export { createAppRouter, RouterHistoryMode, RouterHistory, type CreateAppRouterOptions } from './CreateAppRouter';
export type {
  AppRoute,
  RouteConfig,
  RouteHandle,
  RouteHandleResolver,
  RouteMeta,
  RouteGuard,
  GuardContext,
  GuardDecision,
  LazyRoute,
  CrumbNode,
} from './RouteConfig';

// Root behaviors — react-router mounted these as components under `<AppRoot>`; here they are router
// hooks `createAppRouter` installs, each returning its own unregister function.
export { installDocumentTitle, type DocumentTitleOptions } from './DocumentTitle';
export { installDocumentMeta } from './DocumentMeta';
export { installRoutePersistence, type RoutePersistenceOptions } from './RoutePersistence';
export { installPageViewTracker, type PageView, type PageViewTrackerOptions } from './PageViewTracker';

// Components
export { default as RouteAnnouncer, type RouteAnnouncerProps } from './routeAnnouncer/RouteAnnouncer.vue';
export { default as NotFound, type NotFoundProps } from './notFound/NotFound.vue';
export { default as RoutePageHeader, type RoutePageHeaderProps } from './routePageHeader/RoutePageHeader.vue';
export { default as AppErrorBoundary, type AppErrorBoundaryProps } from './appErrorBoundary/AppErrorBoundary.vue';
export {
  default as NavigationProgress,
  type NavigationProgressProps,
} from './navigationProgress/NavigationProgress.vue';
export { default as ProgressProvider, type ProgressProviderProps } from '../../ProgressProvider.vue';
export { NavigationProgressMode, NavigationProgressVariant } from '../../NavigationProgressModes';
export {
  useNavigationProgress,
  provideNavigationProgress,
  createNavigationProgress,
  NavigationProgressKey,
  type NavigationProgressState,
} from '../../hooks/UseNavigationProgress';
export { useRouteNavigating } from './hooks/UseRouteNavigating';

// Typed paths + search params (generic builder only — apps declare their own `paths` registry over it)
export { definePath } from '../../Paths';
export type { PathBuilder, PathBuilderArgs, PathParamName, PathParams } from '../../Paths';
export { useTypedSearchParams, type TypedSearchParams } from './hooks/UseTypedSearchParams';

// Guards + returnTo
export {
  requireAuth,
  buildReturnTo,
  resolveReturnTo,
  useReturnTo,
  signInRedirect,
  type ReturnToSource,
} from './Guards';

// Nav helpers
export { default as AppLink, type AppLinkProps } from './appLink/AppLink.vue';
export { default as AppNavLink, type AppNavLinkProps } from './appNavLink/AppNavLink.vue';
export { useBreadcrumbs, type Breadcrumb } from './hooks/UseBreadcrumbs';
export { usePrefetch, prefetch, prefetchProps, type PrefetchProps } from './hooks/UsePrefetch';
export { useNavigationBlocker, BlockerState, type NavigationBlocker } from './hooks/UseNavigationBlocker';
export { lazyPage, lazyRoute, reloadOnChunkError } from './LazyRoute';
