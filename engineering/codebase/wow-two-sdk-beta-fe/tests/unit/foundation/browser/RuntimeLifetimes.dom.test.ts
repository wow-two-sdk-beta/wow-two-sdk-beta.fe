import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSyncChannel, useBroadcastState, type BroadcastStateControls } from '@src/foundation/channels';
import { useDrag, useLongPress, usePinch } from '@src/foundation/gestures';
import {
  observeIntersection,
  observeMutation,
  useResizeObserver,
  useIntersectionObserver,
} from '@src/foundation/observers';
import { useEscape, useHotkeys, useHotkeyMap } from '@src/foundation/shortcuts';
import { memoryStorageBroker } from '@src/foundation/storage';
import { xhrUploadTransport } from '@src/foundation/uploads';
import { useVirtualList, type VirtualList } from '@src/foundation/virtualization';
import { useWorker, type UseWorkerControls } from '@src/foundation/workers';

const wrappers: { unmount: () => void }[] = [];
function setup(fn: () => void) {
  const wrapper = mount(
    defineComponent({
      setup() {
        fn();
        return () => h('div');
      },
    }),
  );
  wrappers.push(wrapper);
  return wrapper;
}
function pointer(target: EventTarget, type: string, button = 0, pointerId = 1) {
  const event = new MouseEvent(type, { button, clientX: 5, clientY: 5 });
  Object.defineProperties(event, { pointerId: { value: pointerId }, pointerType: { value: 'mouse' } });
  target.dispatchEvent(event);
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('browser hooks lifetime boundaries', () => {
  it('delivers both storage frames when the persisted value has already advanced', () => {
    const broker = memoryStorageBroker();
    const channel = createSyncChannel<string>('burst', { transport: 'storage', broker });
    const messages: string[] = [];
    channel.subscribe((message) => messages.push(message));
    const first = { sender: 'sender', seq: 0, timestamp: 1, message: 'first' };
    const second = { sender: 'sender', seq: 1, timestamp: 2, message: 'second' };
    broker.write('wow-two.sync.burst', second);
    window.dispatchEvent(new StorageEvent('storage', { key: 'wow-two.sync.burst', newValue: JSON.stringify(first) }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'wow-two.sync.burst', newValue: JSON.stringify(second) }));
    expect(messages).toEqual(['first', 'second']);
    channel.close();
  });

  it('resets broadcast state before joining a new identity channel', async () => {
    const key = shallowRef('person-a');
    let state!: BroadcastStateControls<string>;
    const broker = memoryStorageBroker();
    const write = vi.spyOn(broker, 'write');
    setup(() => {
      state = useBroadcastState(key, 'empty', { transport: 'storage', broker });
    });
    expect(write).toHaveBeenCalledWith(
      'wow-two.sync.broadcast-state.person-a',
      expect.objectContaining({ message: { kind: 'request' } }),
    );
    state.setValue('private-a');
    key.value = 'person-b';
    expect(state.value.value).toBe('empty');
    state.setValue('private-b');
    expect(write).toHaveBeenLastCalledWith(
      'wow-two.sync.broadcast-state.person-b',
      expect.objectContaining({ message: { kind: 'announce', value: 'private-b' } }),
    );
    await nextTick();
  });

  it('does not invoke commands or dismissals during IME composition', async () => {
    const escape = vi.fn(),
      hotkey = vi.fn(),
      map = vi.fn();
    setup(() => {
      useEscape(escape);
      useHotkeys('ctrl+enter', hotkey);
      useHotkeyMap({ 'ctrl+k': map });
    });
    await nextTick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, isComposing: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, isComposing: true }));
    expect(escape).not.toHaveBeenCalled();
    expect(hotkey).not.toHaveBeenCalled();
    expect(map).not.toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(escape).toHaveBeenCalledOnce();
  });

  it('cancels an in-flight hold and drag when disabled changes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const disabled = shallowRef(false);
    const element = document.createElement('div');
    const press = vi.fn(),
      start = vi.fn(),
      move = vi.fn(),
      end = vi.fn();
    setup(() => {
      useLongPress(element, press, () => ({ disabled: disabled.value, delayMs: 20 }));
      useDrag(element, { onDragStart: start, onDragMove: move, onDragEnd: end }, () => ({ disabled: disabled.value }));
    });
    await nextTick();
    pointer(element, 'pointerdown');
    expect(start).toHaveBeenCalledOnce();
    disabled.value = true;
    await nextTick();
    pointer(window, 'pointermove');
    pointer(window, 'pointerup');
    await vi.advanceTimersByTimeAsync(30);
    expect(press).not.toHaveBeenCalled();
    expect(move).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it('ignores secondary-button gestures', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const element = document.createElement('div');
    const start = vi.fn(),
      press = vi.fn(),
      pinch = vi.fn();
    setup(() => {
      useLongPress(element, press, { delayMs: 20 });
      useDrag(element, { onDragStart: start });
      usePinch(element, { onPinchStart: pinch });
    });
    await nextTick();
    pointer(element, 'pointerdown', 2, 1);
    pointer(element, 'pointerdown', 2, 2);
    await vi.advanceTimersByTimeAsync(30);
    expect(press).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(pinch).not.toHaveBeenCalled();
  });

  it('drops queued intersection and mutation callbacks after disposal', () => {
    let intersection!: IntersectionObserverCallback, mutation!: MutationCallback;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersection = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(callback: MutationCallback) {
          mutation = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const first = vi.fn(),
      second = vi.fn();
    const element = document.createElement('div');
    const offFirst = observeIntersection(element, first),
      offSecond = observeMutation(element, second);
    offFirst();
    offSecond();
    intersection([{ target: element } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    mutation([], {} as MutationObserver);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('drops a stale resize callback after a target is replaced', async () => {
    const callbacks: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const first = document.createElement('div');
    const target = shallowRef(first);
    const changed = vi.fn();
    setup(() => useResizeObserver(target, changed));
    await nextTick();
    target.value = document.createElement('div');
    await nextTick();
    callbacks[0]!([{ target: first } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    expect(changed).not.toHaveBeenCalled();
    callbacks[1]!([{ target: target.value } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('drops intersection entries for a removed target and a disconnected observer', async () => {
    const observers: { callback: IntersectionObserverCallback; self: IntersectionObserver }[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push({ callback, self: this as unknown as IntersectionObserver });
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const first = document.createElement('div'),
      second = document.createElement('div');
    const targets = shallowRef([first]);
    const disabled = shallowRef(false);
    const changed = vi.fn();
    setup(() => useIntersectionObserver(targets, changed, () => ({ disabled: disabled.value })));
    await nextTick();
    targets.value = [second];
    await nextTick();
    const previous = observers[0]!;
    previous.callback([{ target: first } as unknown as IntersectionObserverEntry], previous.self);
    expect(changed).not.toHaveBeenCalled();
    previous.callback([{ target: second } as unknown as IntersectionObserverEntry], previous.self);
    expect(changed).toHaveBeenCalledOnce();
    disabled.value = true;
    await nextTick();
    previous.callback([{ target: second } as unknown as IntersectionObserverEntry], previous.self);
    expect(changed).toHaveBeenCalledOnce();
  });

  it('retains measured sizes by item key when the data reorders', async () => {
    const keys = shallowRef(['a', 'b']);
    const horizontal = shallowRef(false);
    let list!: VirtualList;
    setup(() => {
      list = useVirtualList({
        count: () => keys.value.length,
        getItemKey: (index) => keys.value[index]!,
        estimateSize: () => 10,
        initialViewportSize: 100,
        horizontal,
      });
    });
    list.measureItem(0, 30);
    expect(list.virtualItems.value.map((item) => item.size)).toEqual([30, 10]);
    keys.value = ['b', 'a'];
    await nextTick();
    expect(list.virtualItems.value.map((item) => [item.key, item.size])).toEqual([
      ['b', 10],
      ['a', 30],
    ]);
    horizontal.value = true;
    await nextTick();
    expect(list.totalSize.value).toBe(20);
  });

  it('reports worker construction failure without failing component mount', () => {
    vi.stubGlobal('Worker', class {});
    const onError = vi.fn();
    let state!: UseWorkerControls<{ run: () => number }>;
    setup(() => {
      state = useWorker(
        () => {
          throw new Error('CSP blocked worker');
        },
        { onError },
      );
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'CSP blocked worker' }));
    expect(state.client.value).toBeNull();
  });

  it('removes an upload abort listener if sending fails synchronously', async () => {
    vi.stubGlobal(
      'XMLHttpRequest',
      class extends EventTarget {
        upload = new EventTarget();
        open() {}
        setRequestHeader() {}
        send() {
          throw new Error('send failed');
        }
      },
    );
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    await expect(
      xhrUploadTransport({ url: '/upload' }).upload(new File(['x'], 'item'), {
        signal: controller.signal,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('send failed');
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
