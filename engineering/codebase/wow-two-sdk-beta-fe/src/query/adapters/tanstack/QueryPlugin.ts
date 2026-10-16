import type { Plugin } from 'vue';
import { VueQueryPlugin, type QueryClient } from '@tanstack/vue-query';

/**
 * Mounts the app `QueryClient` on the whole app — the Vue-idiomatic counterpart of React's
 * `<QueryClientProvider>` wrapper, which has no component form in `@tanstack/vue-query`.
 *
 * ```ts
 * createApp(App).use(queryPlugin(createQueryClient())).mount('#app');
 * ```
 *
 * `QueryProvider` is the component form of the same thing, for a subtree (or a test) that needs its
 * own client. Use one or the other, not both.
 */
export function queryPlugin(client: QueryClient): Plugin {
  return {
    install(app) {
      app.use(VueQueryPlugin, { queryClient: client });
    },
  };
}
