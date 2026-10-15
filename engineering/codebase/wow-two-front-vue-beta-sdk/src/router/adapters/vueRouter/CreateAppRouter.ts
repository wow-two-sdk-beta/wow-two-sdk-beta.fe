import type { Component } from 'vue';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
  type Router,
  type RouterHistory as VueRouterHistory,
} from 'vue-router';

import { installDocumentMeta } from './DocumentMeta';
import { installDocumentTitle } from './DocumentTitle';
import { toAsyncComponent } from './LazyRoute';
import NotFound from './notFound/NotFound.vue';
import { installPageViewTracker, type PageView } from './PageViewTracker';
import type { AppRoute, RouteConfig, RouteGuard } from './RouteConfig';
import { installRoutePersistence, type RoutePersistenceOptions } from './RoutePersistence';
import { installRouteNavigating } from './hooks/UseRouteNavigating';
import { createScrollRestoration } from './ScrollRestoration';

/**
 * vue-router's catch-all. A bare `*` is a hard error here ("Catch all routes must now be defined
 * using a param with a custom regexp"), so a `*` authored in a `RouteConfig` is rewritten to it.
 */
const CatchAllPath = '/:pathMatch(.*)*';

/**
 * Defines the history strategy the router uses.
 *
 * Named `RouterHistoryMode`, not `RouterHistory`: vue-router exports a `RouterHistory` TYPE for the
 * history object itself, and one name for two things in the same import graph is a trap.
 * `RouterHistory` stays exported as an alias so existing call sites keep compiling.
 */
export const RouterHistoryMode = {
  /** Refers to the HTML5 History API — clean URLs (default). */
  Browser: 'browser',
  /** Refers to hash-based history — static hosting / file protocol. */
  Hash: 'hash',
  /** Refers to in-memory history — SSR and tests; no URL bar involvement. */
  Memory: 'memory',
} as const;

export type RouterHistoryMode = (typeof RouterHistoryMode)[keyof typeof RouterHistoryMode];

/** @deprecated Alias for {@link RouterHistoryMode} — collides with vue-router's own `RouterHistory` type. */
export const RouterHistory = RouterHistoryMode;

/** @deprecated Alias for {@link RouterHistoryMode} — collides with vue-router's own `RouterHistory` type. */
export type RouterHistory = RouterHistoryMode;

/** Options for `createAppRouter` — every field defaults sensibly; apps usually pass none. */
export interface CreateAppRouterOptions {
  /** A leading path prefix for every route — vue-router's history `base`. */
  readonly basename?: string;

  /** Overrides the built-in `*` catch-all page. */
  readonly notFound?: Component;

  /**
   * Whether to restore scroll position across navigations. Default `true`. Covers the window and every
   * `ScrollRegionAttribute` element, such as the main region of a `region` AppShell: back/forward restores
   * their offsets, a new navigation returns them to the top.
   */
  readonly scrollRestoration?: boolean;

  /** The document-title suffix (usually the app name) applied on every navigation. */
  readonly titleSuffix?: string;

  /** The history strategy. Default `RouterHistoryMode.Browser` — and always memory history without a `window`. */
  readonly history?: RouterHistoryMode;

  /** Emits a page-view on each navigation — an analytics sink; when set, installs a page-view tracker. */
  readonly onPageView?: (view: PageView) => void;

  /** Route persistence settings, or `false` to install none. Default: installed (persist on, restore off). */
  readonly routePersistence?: RoutePersistenceOptions | false;
}

/** Normalizes a route's `guard` (one or a chain) into an array. */
function toGuards(guard: AppRoute['guard']): ReadonlyArray<RouteGuard> {
  if (!guard) return [];
  return ([] as RouteGuard[]).concat(guard);
}

/**
 * Compiles a route's guards into vue-router's `beforeEnter`.
 *
 * `redirect` is folded in only when the route ALSO has guards: vue-router resolves a record's native
 * `redirect` during matching, before any guard runs, which would invert the intended order — guards
 * first, then the redirect. With no guards the native field is used and this returns `undefined`.
 */
function toBeforeEnter(guards: ReadonlyArray<RouteGuard>, redirectTo: AppRoute['redirect']) {
  if (!guards.length) return undefined;

  // Two parameters on purpose — vue-router reads `guard.length` to decide whether the guard uses the
  // legacy `next` callback or returns its verdict. A third parameter would silently hang navigation.
  return async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    for (const guard of guards) {
      const result = await guard({ to, from, params: to.params });
      if (result !== true) return result.redirect;
    }
    return redirectTo ?? true;
  };
}

/** Maps one `AppRoute` (our model) to a vue-router `RouteRecordRaw`. */
function toRouteRecord(route: AppRoute, isRoot: boolean): RouteRecordRaw {
  const { path, index, component, layout, lazy, redirect, guard, handle, errorComponent, children, id } = route;

  const guards = toGuards(guard);
  const beforeEnter = toBeforeEnter(guards, redirect);

  const record: Record<string, unknown> = { path: toPath(path, index, isRoot) };

  if (id !== undefined) record.name = id;
  if (beforeEnter) record.beforeEnter = beforeEnter;
  else if (redirect !== undefined) record.redirect = redirect;

  if (lazy) record.component = toAsyncComponent(lazy);
  else if (component ?? layout) record.component = component ?? layout;

  // `handle` becomes the record's native `meta`, so `route.meta.title` reads it with no helper.
  // `errorComponent` rides along there too — `AppErrorBoundary` looks it up off the deepest match.
  const meta = { ...handle, ...(errorComponent ? { errorComponent } : {}) };
  if (Object.keys(meta).length > 0) record.meta = meta;

  if (children) record.children = children.map((child) => toRouteRecord(child, false));

  // `RouteRecordRaw` is a union whose members are mutually exclusive (`RouteRecordSingleView` forbids
  // `children`, `RouteRecordRedirect` requires `redirect`), so a record assembled field by field can
  // only be asserted onto it.
  return record as unknown as RouteRecordRaw;
}

/** Resolves the record's `path` — index routes are the empty child, a pathless layout depends on depth. */
function toPath(path: string | undefined, index: boolean | undefined, isRoot: boolean): string {
  if (index) return '';
  if (path === '*' || path === '/*') return CatchAllPath;
  if (path !== undefined) return path;
  // A pathless layout route: vue-router has no such thing, so it becomes a record that adds no
  // segment — `/` at the top (a top-level path must be absolute) and `''` when nested.
  return isRoot ? '/' : '';
}

/** Builds the history the router runs on — memory without a `window`, so SSR never touches `window.location`. */
function toHistory(options: CreateAppRouterOptions): VueRouterHistory {
  const { basename, history } = options;
  if (typeof window === 'undefined' || history === RouterHistoryMode.Memory) return createMemoryHistory(basename);
  if (history === RouterHistoryMode.Hash) return createWebHashHistory(basename);
  return createWebHistory(basename);
}

/**
 * Builds the app's router from a declarative `RouteConfig`. The app declares its routes; this wrapper
 * owns the vue-router machinery — scroll behavior, the catch-all, and the root-mounted behaviors
 * (title · meta tags · route persistence · page views). vue-router installs as a plugin and has no
 * root element, so those behaviors are router hooks registered here; each is separately exported as
 * an `install*` function.
 *
 * It is the single extension point: cross-cutting routing behavior is added here, every consumer
 * inherits it.
 *
 * ```ts
 * const router = createAppRouter(routes, { titleSuffix: 'Acme' });
 * createApp(App).use(router).mount('#app');
 * ```
 */
export function createAppRouter(config: RouteConfig, options: CreateAppRouterOptions = {}): Router {
  const routes: RouteRecordRaw[] = config.map((route) => toRouteRecord(route, true));
  routes.push({ path: CatchAllPath, component: options.notFound ?? NotFound } as RouteRecordRaw);

  const scroll = (options.scrollRestoration ?? true) ? createScrollRestoration() : undefined;
  const router = createRouter({
    history: toHistory(options),
    routes,
    scrollBehavior: scroll?.scrollBehavior,
  });
  scroll?.install(router);

  // Eager, so the FIRST navigation is already observable by `<NavigationProgress mode="auto">` —
  // a lazily installed hook would miss it.
  installRouteNavigating(router);

  installDocumentTitle(router, { suffix: options.titleSuffix });
  installDocumentMeta(router);
  if (options.routePersistence !== false) installRoutePersistence(router, options.routePersistence ?? {});
  if (options.onPageView) installPageViewTracker(router, { onPageView: options.onPageView });

  return router;
}
