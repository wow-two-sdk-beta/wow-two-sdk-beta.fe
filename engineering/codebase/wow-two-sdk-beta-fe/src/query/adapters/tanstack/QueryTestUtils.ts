import { createApp, defineComponent, type App, type Component } from 'vue';
import { QueryClient } from '@tanstack/vue-query';
import { mount, type ComponentMountingOptions, type GlobalMountOptions, type VueWrapper } from '@vue/test-utils';

import { queryPlugin } from './QueryPlugin';

const GcTimeMs = Infinity;

/** Creates a `QueryClient` tuned for tests — retries off, no gc eviction, no focus-refetch. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: GcTimeMs, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** Defines options for `mountWithQuery` — `@vue/test-utils` mounting options plus the client to provide. */
export type MountWithQueryOptions<T> = ComponentMountingOptions<T> & {
  /** The client to provide; a fresh test client when omitted. */
  readonly client?: QueryClient;
};

/** Represents the `@vue/test-utils` wrapper augmented with the `QueryClient` it was mounted against. */
export type MountWithQueryControls = VueWrapper & { readonly client: QueryClient };

/**
 * Mounts `component` with a query client provided, for tests — returns the `@vue/test-utils` wrapper
 * plus the client used.
 *
 * `@testing-library/react` has no Vue counterpart in this repo; `@vue/test-utils` is the installed
 * equivalent, and it MOUNTS A COMPONENT rather than rendering an already-created element, which is
 * why this takes `(component, { props, slots, … })` where React took `(ui)`.
 */
export function mountWithQuery<T>(
  component: T,
  options: MountWithQueryOptions<T> = {} as MountWithQueryOptions<T>,
): MountWithQueryControls {
  const { client = createTestQueryClient(), ...rest } = options;
  const globalOptions: GlobalMountOptions = (rest as { global?: GlobalMountOptions }).global ?? {};

  const wrapper = mount(component as never, {
    ...(rest as object),
    global: { ...globalOptions, plugins: [...(globalOptions.plugins ?? []), queryPlugin(client)] },
  }) as VueWrapper;

  return Object.assign(wrapper, { client });
}

/** @deprecated Use {@link mountWithQuery} — same signature (component + mounting options). */
export const renderWithQuery = mountWithQuery;

/**
 * Builds the `@vue/test-utils` mounting options that provide a query client — spread into a `mount`
 * call: `mount(Component, createQueryWrapper(client))`.
 *
 * React returned a WRAPPER COMPONENT for `renderHook(fn, { wrapper })`. `@vue/test-utils` has no
 * `renderHook`, and providing a client is a mount option here rather than a wrapping component, so
 * that is the shape. For a composable with no component at all, reach for `runWithQuery`.
 */
export function createQueryWrapper(client: QueryClient = createTestQueryClient()): {
  global: GlobalMountOptions;
} {
  return { global: { plugins: [queryPlugin(client)] } };
}

/** Represents a composable run under a query client — its return value plus the teardown. */
export interface RunWithQueryControls<T> {
  /** Whatever the composable returned. */
  readonly result: T;

  /** The client it ran against. */
  readonly client: QueryClient;

  /** The host app, for `app.config` tweaks. */
  readonly app: App;

  /** Tears the host app down — runs `onScopeDispose` / `onUnmounted` cleanups. */
  readonly unmount: () => void;
}

/**
 * Runs a composable inside a throwaway app with a query client provided — the counterpart of React's
 * `renderHook` + wrapper, which `@vue/test-utils` does not ship.
 *
 * Mounts a renderless host into a detached element, so it needs a DOM environment.
 */
export function runWithQuery<T>(
  composable: () => T,
  client: QueryClient = createTestQueryClient(),
): RunWithQueryControls<T> {
  let result!: T;

  const host: Component = defineComponent({
    name: 'QueryComposableHost',
    setup() {
      result = composable();
      return () => null;
    },
  });

  const app = createApp(host);
  app.use(queryPlugin(client));
  app.mount(document.createElement('div'));

  return { result, client, app, unmount: () => app.unmount() };
}
