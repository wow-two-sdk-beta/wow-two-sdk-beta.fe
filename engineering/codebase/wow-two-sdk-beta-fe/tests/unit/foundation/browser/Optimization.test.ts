import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLeaderElection, memorySyncHub } from '@src/foundation/channels';
import { hexToBytes, base64ToBytes, base64UrlToBytes } from '@src/foundation/crypto';
import { distanceBetween, EarthRadiusMetres } from '@src/foundation/geolocation';
import { ExactNumber } from '@src/foundation/numbers';
import { applySort, applyFilters } from '@src/foundation/selection';
import { probeIndexedDb, openDatabase, deleteDatabase } from '@src/foundation/idb';
import { createUploadQueue } from '@src/foundation/uploads';
import { buildMeasurements, withMeasuredSize, findIndexByOffsetAccessor } from '@src/foundation/virtualization';
import { createSocketClient, type SocketClient } from '@src/foundation/net';
import { runInWorker } from '@src/foundation/workers';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

describe('browser capability regression coverage', () => {
  it('unsubscribes a closed election from its externally owned channel', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const hub = memorySyncHub();
    const channel = hub.channel<import('@src/foundation/channels').LeaderSignal>('election');
    const original = channel.subscribe;
    const stop = vi.fn();
    const subscribe = vi.spyOn(channel, 'subscribe').mockImplementation((listener) => {
      const off = original(listener);
      return () => {
        stop();
        off();
      };
    });
    const election = createLeaderElection('election', { channel });
    election.close();
    election.close();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
    expect(channel.closed).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    channel.close();
  });

  it('closes a probe connection that succeeds after the timeout', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const close = vi.fn();
    const request = { result: { close }, onsuccess: () => undefined };
    vi.stubGlobal('indexedDB', { open: () => request, deleteDatabase: vi.fn() });
    const result = probeIndexedDb(10);
    await vi.advanceTimersByTimeAsync(10);
    expect(await result).toBe(false);
    request.onsuccess();
    expect(close).toHaveBeenCalledOnce();
  });

  it.each(['\n', '\r', '\r\n', '\u2028', '\u2029'])(
    'rejects trailing line terminator %j in binary encodings',
    (tail) => {
      expect(() => hexToBytes('ff' + tail)).toThrow(TypeError);
      expect(() => base64ToBytes('/w==' + tail)).toThrow(TypeError);
      expect(() => base64UrlToBytes('_w' + tail)).toThrow(TypeError);
    },
  );

  it('keeps antipodal distances finite at the half-circumference', () => {
    for (let latitude = -89.9; latitude < 90; latitude += 0.1) {
      const distance = distanceBetween({ latitude, longitude: 0 }, { latitude: -latitude, longitude: 180 });
      expect(distance).toBeCloseTo(Math.PI * EarthRadiusMetres, 0);
    }
  });

  it('holds a removed upload slot until the transport settles', async () => {
    const pending = deferred<void>();
    const upload = vi.fn(() => pending.promise);
    const queue = createUploadQueue({ transport: { upload }, concurrency: 1, retry: false });
    const ids = queue.add([new File(['x'], 'a'), new File(['x'], 'b')]);
    expect(upload).toHaveBeenCalledTimes(1);
    queue.remove(ids[0]!);
    expect(upload).toHaveBeenCalledTimes(1);
    pending.resolve();
    await pending.promise;
    await Promise.resolve();
    expect(upload).toHaveBeenCalledTimes(2);
    queue.clear();
  });

  it('holds aborted slots across clear and a fresh add', async () => {
    const pending = deferred<void>();
    const upload = vi.fn(() => pending.promise);
    const queue = createUploadQueue({ transport: { upload }, concurrency: 1, retry: false });
    queue.add([new File(['x'], 'a'), new File(['x'], 'b')]);
    queue.clear();
    queue.add(new File(['x'], 'c'));
    expect(upload).toHaveBeenCalledTimes(1);
    pending.resolve();
    await pending.promise;
    await Promise.resolve();
    expect(upload).toHaveBeenCalledTimes(2);
    queue.clear();
  });

  it.each([NaN, Infinity])('uses finite default upload concurrency for %s', async (concurrency) => {
    const pending = deferred<void>();
    const upload = vi.fn(() => pending.promise);
    const queue = createUploadQueue({ transport: { upload }, concurrency, retry: false });
    queue.add(Array.from({ length: 4 }, (_, i) => new File(['x'], String(i))));
    expect(upload).toHaveBeenCalledTimes(3);
    queue.clear();
    pending.resolve();
    await pending.promise;
  });

  it('rejects fractional measurement indices without corrupting offsets', () => {
    const original = buildMeasurements(3, () => 10);
    expect(withMeasuredSize(original, 0.5, 20)).toBe(original);
  });

  it('searches a large virtual range without truncating indices to uint32', () => {
    const count = 2 ** 32 + 10;
    let reads = 0;
    const index = findIndexByOffsetAccessor(
      (at) => {
        if (++reads > 100) throw new Error('search did not converge');
        return at;
      },
      count,
      count - 2,
    );
    expect(index).toBe(count - 2);
    expect(reads).toBeLessThan(40);
  });

  it('settles a worker reply deserialization failure and releases its resources', async () => {
    const terminate = vi.fn();
    vi.stubGlobal(
      'Worker',
      class extends EventTarget {
        terminate = terminate;
        postMessage() {
          queueMicrotask(() => this.dispatchEvent(new Event('messageerror')));
        }
      },
    );
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const result = await runInWorker(() => 1, []);
    expect(result).toMatchObject({ ok: false, failure: { status: 'failed' } });
    expect(terminate).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledOnce();
  });
  it('sorts and filters lossless numeric values by magnitude and numeric equality', () => {
    const number = (text: string) => {
      const parsed = ExactNumber.parse(text);
      if (!parsed.ok) throw new Error('Invalid fixture');
      return parsed.value;
    };
    const rows = ['10', '2', '1.00'].map((text) => ({ value: number(text) }));
    expect(applySort(rows, [{ field: 'value', direction: 'asc' }])).toEqual([rows[2], rows[1], rows[0]]);
    expect(applyFilters(rows, [{ field: 'value', op: 'equals', value: number('1') }])).toEqual([rows[2]]);
    expect(applyFilters(rows, [{ field: 'value', op: 'gt', value: number('2') }])).toEqual([rows[0]]);
  });

  it.each(['open', 'delete'] as const)(
    'rejects a throwing %s blocked callback instead of hanging',
    async (operation) => {
      const request = { onblocked: () => undefined };
      vi.stubGlobal('indexedDB', { open: () => request, deleteDatabase: () => request });
      const error = new Error('blocked callback failed');
      const options = {
        onBlocked: () => {
          throw error;
        },
      };
      const pending = operation === 'open' ? openDatabase('x', options) : deleteDatabase('x', options);
      request.onblocked();
      await expect(pending).rejects.toBe(error);
    },
  );
  it('does not install a heartbeat when an open callback closes the socket', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const transport = Object.assign(new EventTarget(), { readyState: 1, send: vi.fn(), close: vi.fn() });
    const client: SocketClient = createSocketClient('ws://test', {
      socket: () => transport,
      heartbeat: { intervalMs: 10 },
      onOpen: () => client.close(),
    });
    transport.dispatchEvent(new Event('open'));
    expect(client.readyState).toBe('closed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
