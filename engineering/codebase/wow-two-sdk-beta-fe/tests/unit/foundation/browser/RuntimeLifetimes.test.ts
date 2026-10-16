import { afterEach, describe, expect, it, vi } from 'vitest';
import { memorySyncHub } from '@src/foundation/channels';
import type { WorkerScope } from '@src/foundation/workers/WorkerHost';
import { retryAsync } from '@src/foundation/async';
import { createUndoHistory } from '@src/foundation/history';
import { withTransaction } from '@src/foundation/idb';
import { createEventStream, createPoller, createSocketClient } from '@src/foundation/net';
import { subscribeToPermissionChange } from '@src/foundation/notifications/QueryPermission';
import { holdWakeLock } from '@src/foundation/screen';
import { applyFilters, applySort } from '@src/foundation/selection';
import { onVoicesChanged } from '@src/foundation/speech/ListVoices';
import { toSpeechRecognitionFailure } from '@src/foundation/speech/SpeechRecognitionResult';
import { DefaultRetryPolicy } from '@src/foundation/resilience';
import { createUploadQueue, type UploadTransportContext } from '@src/foundation/uploads';
import { exposeWorkerApi } from '@src/foundation/workers';
import { createRequestMessage } from '@src/foundation/workers/WorkerProtocol';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
function timers() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

class Connection extends EventTarget {
  readyState = 0;
  send = vi.fn();
  close = vi.fn();
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
}

describe('browser runtime lifetimes', () => {
  it('closes old in-memory channels when their hub resets', () => {
    const hub = memorySyncHub();
    const old = hub.channel<string>('private');
    hub.reset();
    const current = hub.channel<string>('private');
    const receive = vi.fn();
    current.subscribe(receive);
    old.post('old session');
    expect(old.closed).toBe(true);
    expect(hub.openCount).toBe(1);
    expect(receive).not.toHaveBeenCalled();
    current.close();
  });

  it('settles a cancelled retry even when the operation ignores its signal', async () => {
    const pending = deferred<number>();
    const controller = new AbortController();
    const fn = vi.fn(() => pending.promise);
    const result = retryAsync(fn, { signal: controller.signal });
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    pending.resolve(42);
    await settle();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not resurrect pre-clear history from an open transaction', () => {
    const history = createUndoHistory();
    const action = { do: vi.fn(), undo: vi.fn() };
    history.transact(undefined, () => {
      history.push(action);
      history.clear();
    });
    expect(history.size).toBe(0);
    expect(history.undo()).toBe(false);
    history.push(action);
    expect(history.size).toBe(1);
  });

  it('observes an early IndexedDB abort while the transaction delegate is pending', async () => {
    const transaction = {
      error: new Error('transaction aborted'),
      abort: vi.fn(),
      onabort: undefined as (() => void) | undefined,
    };
    transaction.error = new Error('transaction aborted');
    transaction.abort = vi.fn();
    const delegate = deferred<number>();
    const result = withTransaction(
      { transaction: () => transaction } as unknown as IDBDatabase,
      'rows',
      'readonly',
      () => delegate.promise,
    );
    const assertion = expect(result).rejects.toThrow('transaction aborted');
    transaction.onabort?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    delegate.resolve(1);
    await assertion;
  });

  it('keeps socket queue flush and reconnect alive after observer failures', async () => {
    timers();
    const connections: Connection[] = [];
    const onError = vi.fn();
    const client = createSocketClient('ws://fixture', {
      socket: () => {
        const c = new Connection();
        connections.push(c);
        return c;
      },
      onOpen: () => {
        throw new Error('open callback');
      },
      onClose: () => {
        throw new Error('close callback');
      },
      onStateChange: () => {
        throw new Error('state callback');
      },
      onError,
      random: () => 0,
    });
    client.send({ value: 1 });
    connections[0]!.open();
    expect(connections[0]!.send).toHaveBeenCalledWith('{"value":1}');
    connections[0]!.dispatchEvent(new Event('close'));
    expect(client.readyState).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(1000);
    expect(connections).toHaveLength(2);
    expect(onError).toHaveBeenCalled();
    client.close();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports an event stream parse failure without escaping the event handler', () => {
    const connection = new Connection();
    const onError = vi.fn();
    const onMessage = vi.fn();
    const stream = createEventStream('https://fixture/events', {
      eventSource: () => connection,
      onMessage,
      onError,
      parse: () => {
        throw new Error('malformed frame');
      },
    });
    connection.open();
    connection.dispatchEvent(new MessageEvent('message', { data: 'bad' }));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'malformed frame' }), expect.any(Object));
    expect(onMessage).not.toHaveBeenCalled();
    expect(stream.readyState).toBe('open');
    stream.close();
  });

  it('continues a poller after a state observer throws', async () => {
    timers();
    const poll = vi.fn();
    const poller = createPoller(poll, {
      intervalMs: 10,
      pauseWhenHidden: false,
      pauseWhenOffline: false,
      onStateChange: () => {
        throw new Error('observer');
      },
    });
    await vi.advanceTimersByTimeAsync(20);
    expect(poll).toHaveBeenCalledTimes(2);
    poller.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not attach a permission listener after initial notification disposes it', async () => {
    const status = { state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('navigator', { permissions: { query: async () => status } });
    const dispose = subscribeToPermissionChange('camera', () => dispose());
    await settle();
    expect(status.addEventListener).not.toHaveBeenCalled();
  });

  it('updates a held wake lock when the platform releases it', async () => {
    const sentinel = new EventTarget() as EventTarget & { released: boolean; release: () => Promise<void> };
    sentinel.released = false;
    sentinel.release = vi.fn(async () => {
      sentinel.released = true;
    });
    vi.stubGlobal('navigator', { wakeLock: { request: async () => sentinel } });
    const doc = new EventTarget() as EventTarget & { visibilityState: string };
    doc.visibilityState = 'visible';
    vi.stubGlobal('document', doc);
    const hold = holdWakeLock();
    await settle();
    expect(hold.state.held).toBe(true);
    sentinel.released = true;
    sentinel.dispatchEvent(new Event('release'));
    expect(hold.state.held).toBe(false);
    hold.release();
  });

  it('releases a wake lock that arrives after its document was hidden', async () => {
    const pending = deferred<unknown>();
    const release = vi.fn(async () => {});
    vi.stubGlobal('navigator', { wakeLock: { request: () => pending.promise } });
    const doc = new EventTarget() as EventTarget & { visibilityState: string };
    doc.visibilityState = 'visible';
    vi.stubGlobal('document', doc);
    const hold = holdWakeLock();
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    pending.resolve({ released: false, release });
    await settle();
    expect(release).toHaveBeenCalledOnce();
    expect(hold.state.held).toBe(false);
    hold.release();
  });

  it('uses only registered accessors for object-prototype field names', () => {
    const rows = [{ constructor: 'b' }, { constructor: 'a' }];
    expect(applySort(rows, [{ field: 'constructor', direction: 'asc' }], {})).toEqual([rows[1], rows[0]]);
    expect(applyFilters(rows, [{ field: 'constructor', op: 'equals', value: 'a' }], {})).toEqual([rows[1]]);
  });

  it('normalizes unknown speech codes even when they name object prototype properties', () => {
    expect(toSpeechRecognitionFailure({ error: 'constructor' }).status).toBe('failed');
  });

  it('keeps later voice subscribers attached when an earlier fallback subscriber stops', () => {
    const synth = { getVoices: () => [], onvoiceschanged: null as ((event: Event) => void) | null };
    vi.stubGlobal('speechSynthesis', synth);
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = onVoicesChanged(first);
    const stopSecond = onVoicesChanged(second);
    stopFirst();
    synth.onvoiceschanged?.(new Event('voiceschanged'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    stopSecond();
  });

  it('ignores stale upload progress from a previous retry attempt', async () => {
    const calls: { pending: ReturnType<typeof deferred<void>>; options: UploadTransportContext }[] = [];
    const queue = createUploadQueue({
      retry: false,
      transport: {
        upload: (_file, options) => {
          const pending = deferred<void>();
          calls.push({ pending, options });
          return pending.promise;
        },
      },
    });
    const [id] = queue.add(new File(['1234567890'], 'item'));
    calls[0]!.pending.reject(new Error('first fails'));
    await settle();
    expect(queue.retry(id!)).toBe(true);
    calls[1]!.options.onProgress(2, 10);
    calls[0]!.options.onProgress(9, 10);
    expect(queue.get(id!)?.progress).toBe(0.2);
    calls[1]!.pending.resolve();
    await settle();
    queue.clear();
  });

  it('keeps uploads running after subscriber failure', async () => {
    const queue = createUploadQueue({ retry: false, transport: { upload: async () => 'done' } });
    queue.subscribe(() => {
      throw new Error('observer');
    });
    const [id] = queue.add(new File(['x'], 'item'));
    await settle();
    expect(queue.get(id!)?.status).toBe('succeeded');
  });

  it('settles a retry callback failure as an upload failure', async () => {
    const queue = createUploadQueue({
      retry: {
        ...DefaultRetryPolicy,
        maxRetries: 1,
        onRetry: () => {
          throw new Error('retry callback');
        },
      },
      transport: {
        upload: async () => {
          throw new Error('connection');
        },
      },
    });
    const [id] = queue.add(new File(['x'], 'item'));
    await settle();
    expect(queue.get(id!)).toMatchObject({ status: 'failed', error: { message: 'retry callback' } });
  });

  it('drops a worker response completed after host disposal', async () => {
    const pending = deferred<number>();
    const scope = Object.assign(new EventTarget(), { postMessage: vi.fn() });
    const stop = exposeWorkerApi({ get: () => pending.promise }, scope as unknown as WorkerScope);
    scope.dispatchEvent(new MessageEvent('message', { data: createRequestMessage(1, 'get', []) }));
    stop();
    pending.resolve(1);
    await settle();
    expect(scope.postMessage).not.toHaveBeenCalled();
  });

  it('absorbs failure to post both a worker success and its fallback failure', async () => {
    const scope = Object.assign(new EventTarget(), {
      postMessage: vi.fn(() => {
        throw new Error('closed port');
      }),
    });
    const stop = exposeWorkerApi({ get: () => 1 }, scope as unknown as WorkerScope);
    scope.dispatchEvent(new MessageEvent('message', { data: createRequestMessage(1, 'get', []) }));
    await settle();
    expect(scope.postMessage).toHaveBeenCalledTimes(2);
    stop();
  });
});
