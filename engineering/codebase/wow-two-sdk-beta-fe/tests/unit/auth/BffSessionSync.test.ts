import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStatus, type AuthSession, type BffRefreshOptions, type BffSyncMessage, type BffUser } from '@src/auth';
import { connectBffSession } from '@src/auth/BffSessionSync';
import { memorySyncHub, type SyncChannel } from '@src/foundation/channels';
import { AppErrorFactory, ResultExtensions as R, type AppError, type Result } from '@src/foundation/results';
import { Anonymous, fakeHost, Minute, signedIn, user, type FakeHost } from '../../support/FakeAuthHost';

/*
 * The keeper behind the BFF strategy, driven by a fake provider host and a fake clock: tab sync through an
 * in-process hub, and the refresh timer's guarantees (once per expiry, floored pace, bounded retries).
 */

const transportFailure = (): Result<BffUser | null, AppError> => R.fail(AppErrorFactory.unavailable());

function connect(
  host: FakeHost,
  options: {
    sync?: false | { open: (name: string) => SyncChannel<BffSyncMessage> };
    refresh?: false | BffRefreshOptions;
  } = {},
) {
  return connectBffSession(host, {
    sync: options.sync ?? false,
    refresh: options.refresh ?? false,
    now: Date.now,
  });
}

beforeEach(() => vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z') }));
afterEach(() => vi.useRealTimers());

describe('tab sync', () => {
  function tabs() {
    const hub = memorySyncHub();
    const open = (name: string) => hub.channel<BffSyncMessage>(name);
    const make = (initial: AuthSession<BffUser>) => {
      const host = fakeHost(initial);
      const link = connect(host, { sync: { open } });
      return { host, link };
    };
    return { hub, make };
  }

  it('tells the other tabs about a sign-in, and they re-read the session', async () => {
    const { make } = tabs();
    const a = make({ status: AuthStatus.Unknown, user: null });
    const b = make(Anonymous);
    const c = make(Anonymous);

    a.host.set(signedIn(user(30 * Minute)));
    await vi.advanceTimersByTimeAsync(0);

    expect(b.host.revalidate).toHaveBeenCalledTimes(1);
    expect(c.host.revalidate).toHaveBeenCalledTimes(1);
    expect(a.host.revalidate).not.toHaveBeenCalled();
  });

  it('does not announce a first settled sign-out, an unchanged identity or a transient status', async () => {
    const { make } = tabs();
    const a = make({ status: AuthStatus.Unknown, user: null });
    const b = make(Anonymous);

    a.host.set({ status: AuthStatus.Resolving, user: null });
    a.host.set(Anonymous);
    const alice = user(30 * Minute);
    a.host.set(signedIn(alice));
    await vi.advanceTimersByTimeAsync(0);
    expect(b.host.revalidate).toHaveBeenCalledTimes(1);

    a.host.set(signedIn({ ...alice }));
    a.host.set({ status: AuthStatus.Resolving, user: null });
    a.host.set(signedIn({ ...alice }));
    await vi.advanceTimersByTimeAsync(0);
    expect(b.host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('announces a switch to another person', async () => {
    const { make } = tabs();
    const a = make(signedIn(user(30 * Minute, 'alice')));
    const b = make(Anonymous);
    await vi.advanceTimersByTimeAsync(0);
    b.host.revalidate.mockClear();

    a.host.set(signedIn(user(30 * Minute, 'bob')));
    await vi.advanceTimersByTimeAsync(0);

    expect(b.host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('tells the other tabs about a sign-out, and they re-read instead of trusting the message', async () => {
    const { make } = tabs();
    const a = make(signedIn(user(30 * Minute)));
    const b = make(signedIn(user(30 * Minute)));
    await vi.advanceTimersByTimeAsync(0);
    a.host.revalidate.mockClear();
    b.host.revalidate.mockClear();

    a.link.announce('signed-out');
    await vi.advanceTimersByTimeAsync(0);

    expect(b.host.revalidate).toHaveBeenCalledTimes(1);
    expect(a.host.revalidate).not.toHaveBeenCalled();
    expect(b.host.getSession().status).toBe(AuthStatus.Authenticated);
  });

  it('does not echo: a tab applying a hint stays silent, so two tabs never ping-pong', async () => {
    const { make } = tabs();
    const a = make(Anonymous);
    const b = make(Anonymous);
    // The server now holds a session: B's re-read signs it in, which would announce unless B is applying a hint.
    b.host.revalidate.mockImplementation(async () => {
      const found = user(30 * Minute);
      b.host.set(signedIn(found));
      b.link.announce('signed-out');
      return R.ok(found);
    });

    a.host.set(signedIn(user(30 * Minute)));
    await vi.advanceTimersByTimeAsync(10 * Minute);

    expect(b.host.revalidate).toHaveBeenCalledTimes(1);
    expect(a.host.revalidate).not.toHaveBeenCalled();
  });

  it('shares one read between hints that arrive while it runs', async () => {
    const { make } = tabs();
    const a = make(signedIn(user(30 * Minute)));
    const b = make(signedIn(user(30 * Minute)));
    await vi.advanceTimersByTimeAsync(0);
    let release!: () => void;
    b.host.revalidate.mockClear();
    b.host.revalidate.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve(R.ok(b.host.getSession().user)))),
    );

    a.link.announce('signed-out');
    a.link.announce('signed-in');
    await vi.advanceTimersByTimeAsync(0);
    expect(b.host.revalidate).toHaveBeenCalledTimes(1);
    release();
  });

  it('ignores a message that is not a known hint', async () => {
    const hub = memorySyncHub();
    const host = fakeHost(Anonymous);
    connect(host, { sync: { open: (name) => hub.channel<BffSyncMessage>(name) } });
    const rogue = hub.channel<unknown>('wow-two.auth.bff');

    for (const message of [null, 'signed-out', { kind: 'admin' }, { kind: 7 }, {}]) rogue.post(message);
    await vi.advanceTimersByTimeAsync(0);

    expect(host.revalidate).not.toHaveBeenCalled();
  });

  it('uses the configured channel name and stops listening once disposed', async () => {
    const hub = memorySyncHub();
    const names: string[] = [];
    const open = (name: string) => {
      names.push(name);
      return hub.channel<BffSyncMessage>(name);
    };
    const host = fakeHost(Anonymous);
    const link = connectBffSession(host, { sync: { channelName: 'shop.auth', open }, refresh: false, now: Date.now });
    expect(names).toEqual(['shop.auth']);
    expect(hub.openCount).toBe(1);

    link.dispose();
    link.dispose();

    expect(hub.openCount).toBe(0);
    expect(host.listenerCount()).toBe(0);
    link.announce('signed-out');
    host.set(signedIn(user(Minute)));
  });
});

describe('refresh before expiresAt', () => {
  it('refreshes once at the lead and once at expiry, then stops while the server keeps the same end', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    const fixed = host.getSession().user!;
    host.revalidate.mockImplementation(async () => {
      host.set(signedIn({ ...fixed }));
      return R.ok(fixed);
    });
    connect(host, { refresh: {} });

    await vi.advanceTimersByTimeAsync(9 * Minute - 1);
    expect(host.revalidate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(host.revalidate).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(Minute - 1);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(host.revalidate).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(24 * 60 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
  });

  it('earns a new pair of refreshes from every extended expiry', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    host.revalidate.mockImplementation(async () => {
      const extended = user(10 * Minute);
      host.set(signedIn(extended));
      return R.ok(extended);
    });
    connect(host, { refresh: {} });

    await vi.advanceTimersByTimeAsync(9 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(9 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(9 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(3);
  });

  it('floors the pace when the server keeps ending the session inside the lead', async () => {
    const host = fakeHost(signedIn(user(20_000)));
    host.revalidate.mockImplementation(async () => {
      // Each answer ends 20 s from its own read, a hair later than the last, so every one is a new end.
      const extended = user(20_000 + host.revalidate.mock.calls.length);
      host.set(signedIn(extended));
      return R.ok(extended);
    });
    connect(host, { refresh: { minIntervalMs: 15_000 } });

    await vi.advanceTimersByTimeAsync(0);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(host.revalidate).toHaveBeenCalledTimes(6);
  });

  it('refreshes at once when connected already inside the lead window', async () => {
    const host = fakeHost(signedIn(user(30_000)));
    connect(host, { refresh: {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('retries a failed refresh with a doubling delay and gives up after maxRetries', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    host.revalidate.mockImplementation(async () => transportFailure());
    connect(host, { refresh: { retryMs: 30_000, maxRetries: 3 } });

    await vi.advanceTimersByTimeAsync(9 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(host.revalidate).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(host.revalidate).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(24 * 60 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(4);
  });

  it('resumes the normal schedule after a retry succeeds', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    const fixed = host.getSession().user!;
    host.revalidate
      .mockImplementationOnce(async () => transportFailure())
      .mockImplementation(async () => {
        host.set(signedIn({ ...fixed }));
        return R.ok(fixed);
      });
    connect(host, { refresh: {} });

    await vi.advanceTimersByTimeAsync(9 * Minute);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
    // The lead stage succeeded on retry; the expiry check is next, once.
    await vi.advanceTimersByTimeAsync(2 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(60 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(3);
  });

  it('does not retry a read that a newer operation cancelled', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    host.revalidate.mockImplementation(async () => R.fail(AppErrorFactory.cancelled()));
    connect(host, { refresh: {} });

    await vi.advanceTimersByTimeAsync(60 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('treats a throwing strategy as a failed refresh instead of leaking a rejection', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    host.revalidate.mockImplementation(async () => {
      throw new Error('decoder bug');
    });
    connect(host, { refresh: { maxRetries: 1 } });

    await vi.advanceTimersByTimeAsync(24 * 60 * Minute);
    expect(host.revalidate).toHaveBeenCalledTimes(2);
  });

  it('stops when the session ends and when it was never signed in', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    connect(host, { refresh: {} });
    host.set(Anonymous);
    await vi.advanceTimersByTimeAsync(60 * Minute);
    expect(host.revalidate).not.toHaveBeenCalled();

    const anonymous = fakeHost(Anonymous);
    connect(anonymous, { refresh: {} });
    await vi.advanceTimersByTimeAsync(60 * Minute);
    expect(anonymous.revalidate).not.toHaveBeenCalled();
  });

  it('sets no timer for a session with no expiry', async () => {
    const host = fakeHost(signedIn(user(null)));
    connect(host, { refresh: {} });
    await vi.advanceTimersByTimeAsync(24 * 60 * Minute);
    expect(host.revalidate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its timer on dispose and sets none when refresh is off', async () => {
    const host = fakeHost(signedIn(user(10 * Minute)));
    const link = connect(host, { refresh: {} });
    expect(vi.getTimerCount()).toBe(1);
    link.dispose();
    expect(vi.getTimerCount()).toBe(0);

    connect(fakeHost(signedIn(user(10 * Minute))), { refresh: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits out a delay longer than a timer can hold instead of firing early', async () => {
    const host = fakeHost(signedIn(user(40 * 24 * 60 * Minute)));
    connect(host, { refresh: {} });
    await vi.advanceTimersByTimeAsync(30 * 24 * 60 * Minute);
    expect(host.revalidate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10 * 24 * 60 * Minute - 90_000);
    expect(host.revalidate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(host.revalidate).toHaveBeenCalledTimes(1);
  });
});
