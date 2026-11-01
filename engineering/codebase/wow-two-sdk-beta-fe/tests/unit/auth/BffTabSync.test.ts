import { describe, expect, it, vi } from 'vitest';
import { connectBffSession, type BffSessionLink } from '@src/auth/BffSessionSync';
import { Anonymous, fakeHost, Minute, signedIn, user } from '../../support/FakeAuthHost';

/*
 * The real `BroadcastChannel` between two links, with no fake clock: delivery rides the event loop, so this is the
 * one place the transport itself is exercised rather than the in-process hub.
 */

describe('tab sync over BroadcastChannel', () => {
  it('delivers a sign-in and a sign-out announcement to the other tab only', async () => {
    const name = `bff-test-${Math.random()}`;
    const options = { sync: { channelName: name }, refresh: false, now: Date.now } as const;
    const a = fakeHost(Anonymous);
    const b = fakeHost(Anonymous);
    const links: BffSessionLink[] = [connectBffSession(a, options), connectBffSession(b, options)];

    a.set(signedIn(user(30 * Minute)));
    await vi.waitFor(() => expect(b.revalidate).toHaveBeenCalledTimes(1));

    links[0]?.announce('signed-out');
    await vi.waitFor(() => expect(b.revalidate).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(a.revalidate).not.toHaveBeenCalled();
    expect(b.revalidate).toHaveBeenCalledTimes(2);

    for (const link of links) link.dispose();
  });
});
