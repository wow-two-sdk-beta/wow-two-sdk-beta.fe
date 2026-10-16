import type { Component, VNode } from 'vue';
import type { RouteLocationNormalized, RouteLocationRaw, RouteParamsGeneric } from 'vue-router';

/** Defines a breadcrumb label. */
export type CrumbNode = string | VNode;

/**
 * Defines per-route meta tags surfaced to the document head (read off the deepest match's `meta.meta`).
 *
 * A key beginning `og:` is written as `<meta property="…">`, which the Open Graph spec requires and
 * scrapers key on; every other key is written as `<meta name="…">`, the form Twitter cards and
 * `description` use. The prefix IS the discriminator — there is no second field to set.
 */
export interface RouteMeta {
  /** The meta description for this route. */
  readonly description?: string;

  readonly [key: string]: string | undefined;
}

/**
 * Defines a per-route value computed from the active location — the escape hatch for anything a
 * static handle cannot know, a `:slug` page's title being the case that forces it.
 *
 * Runs on every navigation, so it must stay synchronous and cheap: read `route.params` / `route.query`
 * and a module-scope lookup, never fetch. A page whose title only exists after a request sets it from
 * the component instead, once the data lands.
 */
export type RouteHandleResolver<TValue> = (route: RouteLocationNormalized) => TValue | undefined;

/** Defines the outcome of a route guard — `true` to allow activation, or a location to redirect to. */
export type GuardDecision = true | { readonly redirect: RouteLocationRaw };

/**
 * Defines the context a route guard receives.
 *
 * React's guards ran inside a react-router loader and read a `Request`; vue-router guards run as
 * `beforeEnter` and receive the two normalized locations instead. `params` is `to.params`, kept
 * under React's name because guards read it constantly.
 */
export interface GuardContext {
  /** The location being navigated to. */
  readonly to: RouteLocationNormalized;

  /** The location being navigated from. */
  readonly from: RouteLocationNormalized;

  /** The matched path params — the same object as `to.params`. */
  readonly params: RouteParamsGeneric;
}

/** Defines a route guard — runs before the route activates; returns allow (`true`) or a redirect. */
export type RouteGuard = (context: GuardContext) => GuardDecision | Promise<GuardDecision>;

/**
 * Defines per-route metadata surfaced to breadcrumbs / title / analytics — app keys pass through
 * untouched. Compiles into the route record's native vue-router `meta`, so `route.meta.title`
 * reads it without any helper.
 */
export interface RouteHandle {
  /** The breadcrumb label for this route. */
  readonly crumb?: CrumbNode;

  /** The document title for this route, or a resolver against the active location. */
  readonly title?: string | RouteHandleResolver<string>;

  /** The line `RoutePageHeader` shows under the title, or a resolver; falls back to `meta.description`. */
  readonly description?: string | RouteHandleResolver<string>;

  /** The per-route meta tags (description / og) for the document head, or a resolver against the active location. */
  readonly meta?: RouteMeta | RouteHandleResolver<RouteMeta>;

  readonly [key: string]: unknown;
}

/** Defines a code-split route module — resolves to a `default` or a named `Component` export. */
export type LazyRoute = () => Promise<{ default: Component } | { Component: Component }>;

/**
 * Defines the declarative route unit an app authors — a curated subset of vue-router's
 * `RouteRecordRaw`. `createAppRouter` compiles it: guards become `beforeEnter`, `handle` becomes
 * `meta`, `id` becomes `name`, and the `*` catch-all is appended for you.
 */
export interface AppRoute {
  /** The path segment, relative to the parent. Omit for a pathless layout route. */
  readonly path?: string;

  /** Renders in the parent's `<RouterView>` — compiles to a child with `path: ''`. Mutually exclusive with `path`. */
  readonly index?: boolean;

  /** The eager component. Use `lazy` to code-split instead. */
  readonly component?: Component;

  /** A `*Layout` rendering a `<RouterView>`; an alias of `component`, kept for the React authoring shape. */
  readonly layout?: Component;

  /** A code-split module for this route — preferred for pages. */
  readonly lazy?: LazyRoute;

  /** Redirect this route to another location. Combined with `guard`, the guards run first (React's ordering). */
  readonly redirect?: RouteLocationRaw;

  /** A guard (or chain) run before activation — compiles to the record's `beforeEnter`. */
  readonly guard?: RouteGuard | ReadonlyArray<RouteGuard>;

  /** Per-route metadata (crumb / title / meta / app keys) — compiles to the record's `meta`. */
  readonly handle?: RouteHandle;

  /** A route-scoped error component; `AppErrorBoundary` renders it instead of its own fallback. */
  readonly errorComponent?: Component;

  /** Nested child routes. */
  readonly children?: ReadonlyArray<AppRoute>;

  /** A stable id — compiles to the record's `name`, vue-router's stable identity. */
  readonly id?: string;
}

/** Defines the full route tree an app passes to `createAppRouter`. */
export type RouteConfig = ReadonlyArray<AppRoute>;
