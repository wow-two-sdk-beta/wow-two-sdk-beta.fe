import { defineComponent, h, type Component } from 'vue';
import { useRoute, useRouter, type RouteLocationNormalizedLoaded, type Router } from 'vue-router';

import type { LazyRoute } from './RouteConfig';

/** The pause before a failed code-split import is retried once. */
const RetryDelayMs = 300;

/** Resolves after the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Forces a full reload to fetch the current deploy's chunk manifest — a last resort for a persistent
 * chunk-load failure. No-op without a `window` (SSR).
 */
export function reloadOnChunkError(): void {
  if (typeof window === 'undefined') return;
  window.location.reload();
}

/**
 * Wraps a code-split importer so a transient chunk-load failure — typically a stale deploy whose
 * hashed chunk no longer exists after a redeploy — retries once after a short delay before
 * rejecting. A persistent failure rejects so the router's error handling catches it. Stays
 * type-compatible with `LazyRoute`.
 */
export function lazyRoute(importer: LazyRoute): LazyRoute {
  return async () => {
    try {
      return await importer();
    } catch {
      await delay(RetryDelayMs);
      return importer();
    }
  };
}

/**
 * Code-splits a page and renders it with props decoded from the active route — the page never reads the
 * router, so it renders the same for a direct hit, a reload or in-app navigation, and navigation arrives
 * as callback props. Retries a failed chunk once, as {@link lazyRoute} does.
 * ```ts
 * { path: 'codes/:id', lazy: lazyPage(() => import('./CodePage.vue'), (route, router) => ({
 *     codeId: String(route.params.id),
 *     onBack: () => void router.push('/codes'),
 *   })) }
 * ```
 */
export function lazyPage<TProps extends Record<string, unknown>>(
  importer: () => Promise<{ default: Component }>,
  decode: (route: RouteLocationNormalizedLoaded, router: Router) => TProps,
): LazyRoute {
  return lazyRoute(async () => {
    const page = (await importer()).default;
    return {
      default: defineComponent({
        name: 'LazyPageProps',
        setup() {
          const route = useRoute();
          const router = useRouter();
          return () => h(page, decode(route, router));
        },
      }),
    };
  });
}

/**
 * @internal Normalizes a `default | Component` lazy module into the single component vue-router's
 * async `component` loader expects.
 */
export function toAsyncComponent(lazy: LazyRoute): () => Promise<Component> {
  return async () => {
    const module = await lazy();
    return 'default' in module ? module.default : module.Component;
  };
}
