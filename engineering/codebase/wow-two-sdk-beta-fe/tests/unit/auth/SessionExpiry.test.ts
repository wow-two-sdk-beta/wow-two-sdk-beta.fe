import { describe, expect, it, vi } from 'vitest';
import { AuthStatus, createAuthBridge } from '@src/auth';
import {
  createFeedbackBus,
  feedbackQueryErrors,
  feedbackSessionExpiry,
  NoticeTone,
  SessionExpiredNotice,
  type PublishedNotice,
} from '@src/feedback';
import { createApiClient } from '@src/foundation/http';
import { AppErrorFactory } from '@src/foundation/results';

/*
 * The framework-free half of session expiry: the bridge latch, the transport's outward result and the
 * toast seam. The Vue half (provider, query cache, router) lives in `SessionExpiry.dom.test.ts`.
 */

interface Profile {
  readonly id: string;
}

const alice: Profile = { id: 'alice' };
const unauthorized = (): Promise<Response> => Promise.resolve(new Response(null, { status: 401 }));

function signedInBridge(options: Parameters<typeof createAuthBridge<Profile>>[0] = {}) {
  const bridge = createAuthBridge<Profile>({ getIdentity: (user) => user.id, ...options });
  bridge.publishSession({ status: AuthStatus.Authenticated, user: alice });
  return bridge;
}

describe('session expiry', () => {
  it('expires a bare signed-in bridge once across parallel 401s and cancels every request of it', async () => {
    const bridge = signedInBridge({ getReturnUrl: () => '/servers?env=prod' });
    const invalidated = vi.fn();
    const expired = vi.fn();
    const forwarded = vi.fn();
    bridge.scope.subscribe(invalidated);
    bridge.subscribeExpired(expired);
    bridge.subscribeUnauthorized(forwarded);
    const fetch = vi.fn(unauthorized);
    const http = createApiClient({ scope: bridge.scope, onUnauthorized: bridge.onUnauthorized, fetch });

    const outcomes = await Promise.all(Array.from({ length: 6 }, (_, index) => http.get(`/api/items/${index}`)));

    expect(fetch).toHaveBeenCalledTimes(6);
    expect(outcomes.every((outcome) => !outcome.ok && outcome.failure.code === 'cancelled')).toBe(true);
    expect(expired).toHaveBeenCalledOnce();
    expect(expired).toHaveBeenCalledWith({
      returnUrl: '/servers?env=prod',
      error: expect.objectContaining({ status: 401 }),
    });
    expect(forwarded).toHaveBeenCalledOnce();
    expect(invalidated).toHaveBeenCalledOnce();
    expect(bridge.getSession()).toEqual({ status: AuthStatus.Anonymous, user: null });
    expect(await bridge.isAuthenticated()).toBe(false);

    const later = await http.get('/api/items/late');
    expect(later).toMatchObject({ ok: false, failure: { code: 'http', status: 401 } });
    expect(expired).toHaveBeenCalledOnce();
    expect(invalidated).toHaveBeenCalledOnce();
  });

  it('settles an unsettled first resolve through the provider seam without calling it an expiry', () => {
    const bridge = createAuthBridge<Profile>();
    const forwarded = vi.fn();
    const expired = vi.fn();
    bridge.subscribeUnauthorized(forwarded);
    bridge.subscribeExpired(expired);

    bridge.onUnauthorized('first resolve');
    bridge.publishSession({ status: AuthStatus.Anonymous, user: null });
    bridge.onUnauthorized('signed out');
    bridge.expire('signed out');

    expect(forwarded).toHaveBeenCalledOnce();
    expect(forwarded).toHaveBeenCalledWith('first resolve');
    expect(expired).not.toHaveBeenCalled();
  });

  it('treats expire() as the same single path and re-arms after the next sign-in', () => {
    const bridge = signedInBridge({ getReturnUrl: () => '/deployments' });
    const expired = vi.fn();
    bridge.subscribeExpired(expired);

    bridge.expire('token lifetime');
    bridge.expire('token lifetime');
    bridge.onUnauthorized('late 401');
    expect(expired).toHaveBeenCalledOnce();
    expect(expired).toHaveBeenCalledWith({ returnUrl: '/deployments', error: 'token lifetime' });

    bridge.publishSession({ status: AuthStatus.Authenticated, user: alice });
    bridge.publishSession({ status: AuthStatus.Resolving, user: null });
    bridge.onUnauthorized('refresh 401');
    expect(expired).toHaveBeenCalledTimes(2);
    expect(expired).toHaveBeenLastCalledWith({ returnUrl: '/deployments', error: 'refresh 401' });
  });

  it('reads `/` as the return location without a browser', () => {
    const bridge = signedInBridge();
    const expired = vi.fn();
    bridge.subscribeExpired(expired);

    bridge.expire();

    expect(expired).toHaveBeenCalledWith({ returnUrl: '/', error: undefined });
  });

  it('settles anonymous and runs every expiry listener even when one throws', () => {
    const bridge = signedInBridge();
    const last = vi.fn();
    bridge.subscribeExpired(() => {
      throw new Error('listener');
    });
    bridge.subscribeExpired(last);

    expect(() => bridge.expire()).toThrow(AggregateError);
    expect(last).toHaveBeenCalledOnce();
    expect(bridge.getSession().status).toBe(AuthStatus.Anonymous);
  });

  it('keeps one expiry when a listener re-enters it', () => {
    const bridge = signedInBridge();
    const expired = vi.fn();
    bridge.subscribeUnauthorized(() => bridge.expire('re-entered'));
    bridge.subscribeExpired(expired);

    bridge.expire('first');

    expect(expired).toHaveBeenCalledOnce();
    expect(expired).toHaveBeenCalledWith({ returnUrl: '/', error: 'first' });
  });

  it('stops delivering after unsubscribe', () => {
    const bridge = signedInBridge();
    const expired = vi.fn();
    bridge.subscribeExpired(expired)();

    bridge.expire();

    expect(expired).not.toHaveBeenCalled();
  });
});

describe('session expiry feedback', () => {
  it('keeps 401 and cancellation out of query error toasts', () => {
    const bus = createFeedbackBus();
    const received: PublishedNotice[] = [];
    bus.subscribe((notice) => received.push(notice));
    const onError = feedbackQueryErrors(bus);

    onError(AppErrorFactory.unauthorized());
    onError(AppErrorFactory.cancelled());
    onError(AppErrorFactory.forbidden());

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ tone: NoticeTone.Danger, title: AppErrorFactory.forbidden().message });
  });

  it('publishes the one neutral expiry notice under a fixed id', () => {
    const bus = createFeedbackBus();
    const received: PublishedNotice[] = [];
    bus.subscribe((notice) => received.push(notice));

    feedbackSessionExpiry(bus)();

    expect(received).toEqual([SessionExpiredNotice]);
    expect(received[0]).toMatchObject({ id: 'session-expired', tone: NoticeTone.Info });
  });
});
