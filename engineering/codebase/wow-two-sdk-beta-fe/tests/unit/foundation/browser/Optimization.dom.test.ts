import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, shallowRef } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBreakpoint, type BreakpointScale } from '@src/foundation/device';
import { useSpeechRecognition, useSpeechSynthesis, type SpeechRecognitionControls } from '@src/foundation/speech';
import { useLongPress, useSwipe } from '@src/foundation/gestures';
import { useTypeahead } from '@src/foundation/selection';
import { usePasteHandler } from '@src/foundation/clipboard';
import { useNotificationPermission, type NotificationPermissionControls } from '@src/foundation/notifications';
import { usePolling } from '@src/foundation/net';
import { useUploadQueue } from '@src/foundation/uploads';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('browser hook scale and ownership', () => {
  it('observes every valid breakpoint and releases removed queries', async () => {
    const listeners = new Set<unknown>();
    const matchMedia = vi.fn((query: string) => ({
      matches: Number(/\d+/.exec(query)?.[0]) <= 150,
      addEventListener: (_: string, handler: unknown) => listeners.add(handler),
      removeEventListener: (_: string, handler: unknown) => listeners.delete(handler),
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    const scale = shallowRef<BreakpointScale>(
      Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['b' + i, i * 100])),
    );
    const wrapper = mount(
      defineComponent({
        setup() {
          const active = useBreakpoint(scale);
          return () => h('span', active.value ?? 'none');
        },
      }),
    );
    await nextTick();
    expect(wrapper.text()).toBe('b1');
    expect(listeners.size).toBe(10);
    scale.value = { small: 0, large: 1000 };
    await nextTick();
    expect(wrapper.text()).toBe('small');
    expect(listeners.size).toBe(2);
    expect(matchMedia).toHaveBeenCalledTimes(12);
    wrapper.unmount();
    expect(listeners.size).toBe(0);
  });

  it('awaits a direct async polling callback before scheduling another tick', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    let resolve!: () => void;
    const pending = new Promise<void>((accept) => {
      resolve = accept;
    });
    const work = vi.fn(() => pending);
    const onError = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          usePolling(work, {
            immediate: true,
            intervalMs: 10,
            pauseWhenHidden: false,
            pauseWhenOffline: false,
            onError,
          });
          return () => h('span');
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(100);
    expect(work).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(work).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts owned uploads on unmount without starting queued files', async () => {
    const signals: AbortSignal[] = [];
    const upload = vi.fn((_file: File, context: { signal: AbortSignal }) => {
      signals.push(context.signal);
      return new Promise<void>((resolve) => context.signal.addEventListener('abort', () => resolve(), { once: true }));
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          const queue = useUploadQueue({ transport: { upload }, concurrency: 1, retry: false });
          queue.add([new File(['x'], 'a'), new File(['x'], 'b')]);
          return () => h('span');
        },
      }),
    );
    wrapper.unmount();
    await Promise.resolve();
    expect(signals[0]?.aborted).toBe(true);
    expect(upload).toHaveBeenCalledTimes(1);
  });
  it('keeps an unresolved explicit paste target detached from the window', async () => {
    const handler = vi.fn();
    const target = shallowRef<HTMLElement | null>(null);
    const wrapper = mount(
      defineComponent({
        setup() {
          usePasteHandler(handler, { target });
          return () => h('span');
        },
      }),
    );
    await nextTick();
    window.dispatchEvent(new Event('paste'));
    expect(handler).not.toHaveBeenCalled();
    target.value = document.createElement('div');
    await nextTick();
    target.value.dispatchEvent(new Event('paste'));
    expect(handler).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('shares a permission request and ignores its completion after unmount', async () => {
    let resolve!: (value: 'granted') => void;
    const pending = new Promise<'granted'>((accept) => {
      resolve = accept;
    });
    const requestPermission = vi.fn(() => pending);
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'default';
        static requestPermission = requestPermission;
      },
    );
    let controls!: NotificationPermissionControls;
    const wrapper = mount(
      defineComponent({
        setup() {
          controls = useNotificationPermission();
          return () => h('span');
        },
      }),
    );
    const first = controls.request();
    const second = controls.request();
    expect(first).toBe(second);
    expect(requestPermission).toHaveBeenCalledOnce();
    wrapper.unmount();
    const snapshot = [controls.permission.value, controls.requesting.value];
    resolve('granted');
    expect(await first).toBe('granted');
    expect([controls.permission.value, controls.requesting.value]).toEqual(snapshot);
  });

  it('does not cancel a held pointer when another pointer lifts', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const held = vi.fn();
    const target = document.createElement('div');
    const wrapper = mount(
      defineComponent({
        setup() {
          useLongPress(target, held, { delayMs: 500 });
          return () => h('span');
        },
      }),
    );
    await nextTick();
    target.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }));
    await vi.advanceTimersByTimeAsync(500);
    expect(held).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('does not recognize a swipe when the browser cancels its pointer', async () => {
    const swipe = vi.fn();
    const target = document.createElement('div');
    const wrapper = mount(
      defineComponent({
        setup() {
          useSwipe(target, { onSwipe: swipe }, { threshold: 1, velocityThreshold: 0 });
          return () => h('span');
        },
      }),
    );
    await nextTick();
    target.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 0 }));
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, clientX: 100 }));
    expect(swipe).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores input method composition in typeahead', () => {
    const onMatch = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup() {
          const typeahead = useTypeahead({ items: ['alpha'], getLabel: (item: string) => item, onMatch });
          expect(typeahead.onKeyDown(new KeyboardEvent('keydown', { key: 'a', isComposing: true }))).toBe(false);
          return () => h('span');
        },
      }),
    );
    expect(onMatch).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores callbacks from a replaced or disposed speech recognizer', async () => {
    const instances: FakeRecognizer[] = [];
    class FakeRecognizer {
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      constructor() {
        instances.push(this);
      }
      start() {}
      stop() {}
      abort() {}
    }
    vi.stubGlobal('SpeechRecognition', FakeRecognizer);
    const lang = shallowRef('en');
    const onEnd = vi.fn();
    let controls!: SpeechRecognitionControls;
    const wrapper = mount(
      defineComponent({
        setup() {
          controls = useSpeechRecognition(() => ({ lang: lang.value, onEnd }));
          return () => h('span');
        },
      }),
    );
    controls.start();
    instances[0]!.onstart?.();
    expect(controls.listening.value).toBe(true);
    lang.value = 'fr';
    await nextTick();
    controls.start();
    instances[1]!.onstart?.();
    instances[0]!.onend?.();
    expect(controls.listening.value).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();
    wrapper.unmount();
    instances[1]!.onend?.();
    expect(onEnd).not.toHaveBeenCalled();
    expect(controls.start()).toMatchObject({ ok: false });
    expect(instances).toHaveLength(2);
  });

  it('does not enqueue speech through a disposed synthesis control', async () => {
    let controls!: ReturnType<typeof useSpeechSynthesis>;
    const wrapper = mount(
      defineComponent({
        setup() {
          controls = useSpeechSynthesis();
          return () => h('span');
        },
      }),
    );
    wrapper.unmount();
    expect(await controls.speak('x')).toMatchObject({ ok: false, failure: { status: 'cancelled' } });
  });
});
