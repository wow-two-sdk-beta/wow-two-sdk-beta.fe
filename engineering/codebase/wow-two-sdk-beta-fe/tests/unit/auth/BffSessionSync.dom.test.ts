import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStatus } from '@src/auth';
import { connectBffSession, type BffSessionLink } from '@src/auth/BffSessionSync';
import { memoryStorageBroker } from '@src/foundation/storage';
import { Anonymous, fakeHost, Minute, signedIn, user } from '../../support/FakeAuthHost';

/*
 * The browser half of the keeper under happy-dom: focus and visibility wake a stale session, and the `storage`
 * event carries a peer's hint when `BroadcastChannel` is unavailable.
 */

const links: BffSessionLink[] = [];
const link = (...args: Parameters<typeof connectBffSession>): BffSessionLink => {
  const created = connectBffSession(...args);
  links.push(created);
  return created;
};

beforeEach(() => vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z') }));
afterEach(() => {
  for (const created of links.splice(0)) created.dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const focus = (): boolean => window.dispatchEvent(new Event('focus'));
function visibility(state: 'visible' | 'hidden'): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('wake on focus', () => {
  const options = { sync: false, refresh: {}, now: () => Date.now() } as const;

  it('re-reads a session older than the staleness window, signed in or out', async () => {
    const signedInHost = fakeHost(signedIn(user(30 * Minute)));
    const signedOutHost = fakeHost(Anonymous);
    link(signedInHost, options);
    link(signedOutHost, options);

    await vi.advanceTimersByTimeAsync(29_000);
    focus();
    expect(signedInHost.revalidate).not.toHaveBeenCalled();
    expect(signedOutHost.revalidate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    focus();
    expect(signedInHost.revalidate).toHaveBeenCalledTimes(1);
    expect(signedOutHost.revalidate).toHaveBeenCalledTimes(1);
  });

  it('does not loop: a read marks the session fresh, and the signed-out answer changes nothing', async () => {
    const host = fakeHost(Anonymous);
    link(host, options);

    await vi.advanceTimersByTimeAsync(30_000);
    focus();
    await vi.advanceTimersByTimeAsync(0);
    focus();
    focus();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(host.revalidate).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    focus();
    expect(host.revalidate).toHaveBeenCalledTimes(2);
  });

  it('reads once when focus and visibility arrive together', async () => {
    const host = fakeHost(signedIn(user(30 * Minute)));
    link(host, options);
    await vi.advanceTimersByTimeAsync(31_000);

    focus();
    visibility('visible');

    expect(host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('ignores a tab turning hidden and a session that has not settled', async () => {
    const host = fakeHost({ status: AuthStatus.Resolving, user: null });
    link(host, options);
    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    expect(host.revalidate).not.toHaveBeenCalled();

    host.set(Anonymous);
    await vi.advanceTimersByTimeAsync(31_000);
    visibility('hidden');
    expect(host.revalidate).not.toHaveBeenCalled();
    visibility('visible');
    expect(host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('does not wake when refresh is off, and stops after dispose', async () => {
    const off = fakeHost(signedIn(user(30 * Minute)));
    link(off, { sync: false, refresh: false, now: () => Date.now() });
    const disposed = fakeHost(signedIn(user(30 * Minute)));
    const created = link(disposed, options);
    created.dispose();

    await vi.advanceTimersByTimeAsync(31_000);
    focus();

    expect(off.revalidate).not.toHaveBeenCalled();
    expect(disposed.revalidate).not.toHaveBeenCalled();
  });
});

describe('storage-event fallback', () => {
  const key = 'wow-two.sync.wow-two.auth.bff';
  const envelope = (kind: string, sender = 'peer-tab') =>
    JSON.stringify({ sender, seq: 0, timestamp: 1, message: { kind } });
  const storageEvent = (newValue: string | null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));

  it('re-reads the session when a peer tab writes a hint', async () => {
    const host = fakeHost(signedIn(user(30 * Minute)));
    link(host, {
      sync: { transport: 'storage', broker: memoryStorageBroker() },
      refresh: false,
      now: () => Date.now(),
    });

    storageEvent(envelope('signed-out'));
    await vi.advanceTimersByTimeAsync(0);

    expect(host.revalidate).toHaveBeenCalledTimes(1);
  });

  it('writes this tab’s sign-in and sign-out hints under the channel key', async () => {
    const broker = memoryStorageBroker();
    const write = vi.spyOn(broker, 'write');
    const host = fakeHost({ status: AuthStatus.Unknown, user: null });
    const created = link(host, { sync: { transport: 'storage', broker }, refresh: false, now: () => Date.now() });

    host.set(signedIn(user(30 * Minute)));
    created.announce('signed-out');

    expect(write.mock.calls.map(([name, value]) => [name, (value as { message: unknown }).message])).toEqual([
      [key, { kind: 'signed-in' }],
      [key, { kind: 'signed-out' }],
    ]);
  });

  it('ignores unrelated keys, malformed data and foreign messages', async () => {
    const host = fakeHost(signedIn(user(30 * Minute)));
    link(host, {
      sync: { transport: 'storage', broker: memoryStorageBroker() },
      refresh: false,
      now: () => Date.now(),
    });

    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: envelope('signed-out') }));
    storageEvent('{not json');
    storageEvent(envelope('promote-to-admin'));
    storageEvent(null);
    await vi.advanceTimersByTimeAsync(0);

    expect(host.revalidate).not.toHaveBeenCalled();
  });
});
