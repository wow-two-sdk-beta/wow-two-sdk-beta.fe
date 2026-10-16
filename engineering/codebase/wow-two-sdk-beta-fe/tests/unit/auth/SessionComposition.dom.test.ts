import { defineComponent, h, onScopeDispose } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, AuthStatus, createAuthBridge, useAuth, type AuthApi } from '@src/auth';
import { ApiFailureFactory, createApiClient } from '@src/foundation/http';
import { ResultExtensions as R, type Result } from '@src/foundation/results';
import type { AppForm } from '@src/formsEngine';
import { useAppForm } from '@src/formsEngine/adapters/house';
import { createQueryClient, queryPlugin, useAppMutation } from '@src/query';
import { createAppRouter, requireAuth, RouterHistoryMode } from '@src/router';

interface Profile {
  id: string;
  title: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

describe('session composition', () => {
  it('isolates form, HTTP, query and guarded navigation when an old save completes after identity changes', async () => {
    const alice = { id: 'alice', title: 'Alice' };
    const bob = { id: 'bob', title: 'Bob' };
    const bridge = createAuthBridge<Profile>({ getIdentity: (user) => user.id });
    const queries = createQueryClient({ scope: bridge.scope });
    const oldResponse = deferred<Response>();
    const resolveIdentity = deferred<Result<Profile | null>>();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      // Deliberately ignores cancellation: a transport can complete after ownership expires.
      .mockReturnValueOnce(oldResponse.promise)
      .mockResolvedValueOnce(Response.json({ data: { id: 'bob', title: 'Bob saved' } }));
    let auth!: AuthApi<Profile>;
    let form!: AppForm<Profile>;
    const http = createApiClient({
      scope: bridge.scope,
      onUnauthorized: bridge.onUnauthorized,
      getAuthToken: () => auth.user?.id ?? null,
      fetch,
    });
    const EmptyPage = defineComponent({ render: () => null });
    const router = createAppRouter(
      [
        { path: '/', component: EmptyPage },
        { path: '/edit', component: EmptyPage, guard: requireAuth(bridge.isAuthenticated) },
        { path: '/workspace/:id', component: EmptyPage, guard: requireAuth(bridge.isAuthenticated) },
        { path: '/saved/:id', component: EmptyPage, guard: requireAuth(bridge.isAuthenticated) },
        { path: '/login', component: EmptyPage },
      ],
      { history: RouterHistoryMode.Memory, routePersistence: false, scrollRestoration: false },
    );
    const confirmed = vi.fn((profile: Profile) => {
      queries.setQueryData(['profile'], profile);
      void router.push(`/saved/${profile.id}`);
    });
    const Child = defineComponent({
      setup() {
        auth = useAuth<Profile>();
        const mutation = useAppMutation({
          mutationFn: ({ values, signal }: { values: Profile; signal: AbortSignal }) =>
            http.put('/profile', {
              body: values,
              signal,
              decode: (value) =>
                typeof value === 'object' &&
                value !== null &&
                'id' in value &&
                typeof value.id === 'string' &&
                'title' in value &&
                typeof value.title === 'string'
                  ? R.ok({ id: value.id, title: value.title })
                  : R.fail(ApiFailureFactory.create('protocol')),
            }),
          onConfirmed: confirmed,
        });
        form = useAppForm({
          defaultValues: { id: '', title: '' },
          onSubmit: (values, { signal }) => mutation.mutateAsync({ values, signal }),
        });
        // Session reset is an explicit app composition seam, not a hidden global form registry.
        onScopeDispose(
          bridge.scope.subscribe(() => form.invalidateSession(bridge.getSession().user ?? { id: '', title: '' })),
        );
        return () => null;
      },
    });
    const wrapper = mount(AuthProvider<Profile>, {
      props: { bridge, canResolveOnMount: false, strategy: { resolveUser: () => resolveIdentity.promise } },
      slots: { default: () => h(Child) },
      global: { plugins: [queryPlugin(queries), router] },
    });
    try {
      auth.setUser(alice);
      queries.setQueryData(['profile'], alice);
      await router.push('/edit');
      form.setValue('title', 'Alice save pending');
      const oldSave = form.handleSubmit();
      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer alice');
      expect(form.state.isSubmitting).toBe(true);

      const refresh = auth.refresh();
      const navigation = router.push('/workspace/bob');
      await flushPromises();
      expect(bridge.getSession().status).toBe(AuthStatus.Resolving);
      expect(router.currentRoute.value.path).toBe('/edit');
      resolveIdentity.resolve(R.ok(bob));
      await refresh;
      await navigation;
      expect(await oldSave).toBe(false);
      expect(queries.getQueryData(['profile'])).toBeUndefined();
      expect(form.values).toEqual(bob);
      expect(form.state.isSubmitSuccessful).toBeNull();
      queries.setQueryData(['profile'], bob);
      form.setValue('title', 'Bob editing');

      oldResponse.resolve(Response.json({ data: { id: 'alice', title: 'Alice saved late' } }));
      await flushPromises();
      expect(confirmed).not.toHaveBeenCalled();
      expect(auth.user).toEqual(bob);
      expect(form.values).toEqual({ id: 'bob', title: 'Bob editing' });
      expect(form.state.submitError).toBeNull();
      expect(queries.getQueryData(['profile'])).toEqual(bob);
      expect(router.currentRoute.value.path).toBe('/workspace/bob');

      expect(await form.handleSubmit()).toBe(true);
      await flushPromises();
      expect(new Headers(fetch.mock.calls[1]?.[1]?.headers).get('authorization')).toBe('Bearer bob');
      expect(confirmed).toHaveBeenCalledTimes(1);
      expect(form.values).toEqual({ id: 'bob', title: 'Bob editing' });
      expect(form.state.isSubmitSuccessful).toBe(true);
      expect(form.state.isDirty).toBe(false);
      expect(queries.getQueryData(['profile'])).toEqual({ id: 'bob', title: 'Bob saved' });
      expect(router.currentRoute.value.path).toBe('/saved/bob');
    } finally {
      wrapper.unmount();
      queries.dispose();
    }
  });
});
