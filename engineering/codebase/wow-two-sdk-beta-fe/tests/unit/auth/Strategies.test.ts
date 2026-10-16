import { describe, expect, it, vi } from 'vitest';
import { createAuthBridge, createBearerStrategy, createRedirectStrategy, AuthStatus } from '@src/auth';
import { createApiClient, ApiFailureFactory } from '@src/foundation/http';
import { AppErrorFactory, ResultExtensions as R, type Result, type AppError } from '@src/foundation/results';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
}

describe('auth sequencing', () => {
  it('cannot restore a stale credential after logout', async () => {
    const login = deferred<Result<{ token: string; user: string }, AppError>>();
    const strategy = createBearerStrategy({ authenticate: () => login.promise });
    const pending = strategy.signIn!('input', {});
    await strategy.signOut!({});
    login.resolve(R.ok({ token: 'old', user: 'old' }));
    expect(await pending).toEqual(R.fail(AppErrorFactory.cancelled()));
    expect(strategy.getAuthToken()).toBeNull();
  });
  it('clears credentials before remote logout and cannot erase a newer login', async () => {
    const logout = deferred<Result<void, AppError>>();
    const strategy = createBearerStrategy({
      authenticate: async (user: string) => R.ok({ user, token: user }),
      signOut: () => logout.promise,
    });
    await strategy.signIn!('old', {});
    const pending = strategy.signOut!({});
    expect(strategy.getAuthToken()).toBeNull();
    await strategy.signIn!('new', {});
    logout.resolve(R.ok(undefined));
    await pending;
    expect(strategy.getAuthToken()).toBe('new');
  });
  it('does not clear a replacement token when an old resolve returns anonymous', async () => {
    const resolve = deferred<Result<string | null, AppError>>();
    const strategy = createBearerStrategy({
      authenticate: async (user: string) => R.ok({ user, token: user }),
      resolveUser: () => resolve.promise,
    });
    await strategy.signIn!('old', {});
    const pending = strategy.resolveUser({});
    await strategy.signIn!('new', {});
    resolve.resolve(R.ok(null));
    await pending;
    expect(strategy.getAuthToken()).toBe('new');
  });
  it('finishes bridge listeners and waiters even if a callback throws', async () => {
    const bridge = createAuthBridge();
    const last = vi.fn();
    bridge.subscribeUnauthorized(() => {
      throw new Error('callback');
    });
    bridge.subscribeUnauthorized(last);
    expect(() => bridge.onUnauthorized()).toThrow(AggregateError);
    expect(last).toHaveBeenCalledOnce();
    const pending = bridge.isAuthenticated();
    bridge.subscribeSession(() => {
      throw new Error('callback');
    });
    expect(() => bridge.publishSession({ status: AuthStatus.Anonymous, user: null })).toThrow(AggregateError);
    await expect(pending).resolves.toBe(false);
  });
  it('accepts local return paths and rejects remote or malformed defaults', async () => {
    const navigate = vi.fn();
    const strategy = createRedirectStrategy({
      client: createApiClient(),
      decodeUser: () => R.fail(ApiFailureFactory.create('validation')),
      navigate,
    });
    for (const target of ['https://other.test', '//other.test', '/\\other.test', '/a\n']) {
      expect(await strategy.signIn!(target, {})).toMatchObject({ ok: false });
    }
    expect(navigate).not.toHaveBeenCalled();
    expect(await strategy.signIn!('/account?x=1', {})).toEqual(R.ok(undefined));
    expect(navigate).toHaveBeenCalledWith('/api/identity/sign-in?returnUrl=%2Faccount%3Fx%3D1');
  });
});
