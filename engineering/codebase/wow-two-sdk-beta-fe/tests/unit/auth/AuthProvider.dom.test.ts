import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { expect, it } from 'vitest';
import { AuthProvider, useAuth, type AuthApi, type AuthStrategy } from '@src/auth';
import { ResultExtensions as R, type AppError, type Result } from '@src/foundation/results';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
}
function setup(strategy: AuthStrategy<string, string>) {
  let auth!: AuthApi<string, string>;
  const Child = defineComponent({
    setup() {
      auth = useAuth<string, string>();
      return () => h('p', auth.user ?? '');
    },
  });
  const wrapper = mount(AuthProvider, {
    props: { strategy, canResolveOnMount: false },
    slots: { default: () => h(Child) },
  });
  return { wrapper, auth };
}
it('ignores stale login after logout and invalidates on unmount', async () => {
  const login = deferred<Result<string, AppError>>();
  const { wrapper, auth } = setup({ resolveUser: async () => R.ok(null), signIn: () => login.promise });
  const pending = auth.signIn('old');
  await auth.signOut();
  login.resolve(R.ok('old'));
  expect(await pending).toMatchObject({ ok: false, failure: { type: 'cancelled' } });
  expect(auth.user).toBeNull();
  wrapper.unmount();
});
it('preserves a newer login after an older signout completes', async () => {
  const logout = deferred<Result<void, AppError>>();
  const { wrapper, auth } = setup({
    resolveUser: async () => R.ok(null),
    signIn: async (user) => R.ok(user),
    signOut: () => logout.promise,
  });
  const pending = auth.signOut();
  await auth.signIn('new');
  logout.resolve(R.ok(undefined));
  await pending;
  expect(auth.user).toBe('new');
  wrapper.unmount();
});
it('invalidates pending resolve on strategy replacement and scope disposal', async () => {
  const resolve = deferred<Result<string | null, AppError>>();
  const { wrapper, auth } = setup({ resolveUser: () => resolve.promise });
  const pending = auth.refresh();
  await wrapper.setProps({ strategy: { resolveUser: async () => R.ok('new') } });
  resolve.resolve(R.ok('old'));
  await pending;
  await flushPromises();
  expect(auth.user).toBeNull();
  const next = auth.refresh();
  wrapper.unmount();
  expect(await next).toMatchObject({ ok: false });
});
